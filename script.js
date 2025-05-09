// ======================
// Global Variables
// ======================
let map;
let markers = [];
let infoWindow;
let autocomplete;
let currentImageIndex = 0;
let currentPlaceImages = [];
let currentPlaceId = null;
let placesService;
let currentChatPlace = null;
let chatHistory = [];
const GEMINI_API_KEY = "AIzaSyBi8AvYkKxZBBNMBL1PTTMrP8KwPoDNtfE"; // Replace with your actual API key
let recognition;
let isListening = false;

// ======================
// Initialization
// ======================
window.onload = function () {
  initMap();
  initAutocomplete();
  initChatbot();
  initEventListeners();
  checkThemePreference();
};

function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    zoom: 2,
    center: { lat: 20, lng: 0 },
    styles: [
      {
        featureType: "poi",
        elementType: "labels",
        stylers: [{ visibility: "off" }],
      },
      {
        featureType: "transit",
        elementType: "labels.icon",
        stylers: [{ visibility: "off" }],
      },
    ],
    gestureHandling: "greedy",
    disableDefaultUI: true,
    zoomControl: true,
  });

  placesService = new google.maps.places.PlacesService(map);

  // Add map controls
  initMapControls();
}

function initAutocomplete() {
  const input = document.getElementById("locationInput");
  autocomplete = new google.maps.places.Autocomplete(input, {
    types: ["(cities)"],
    fields: ["geometry", "name", "photos"],
  });

  // Add a placeholder image when no photo is available
  autocomplete.addListener("place_changed", () => {
    const place = autocomplete.getPlace();
    if (place.photos && place.photos.length > 0) {
      // You could show a preview of the city here if desired
    }
  });
}

function initChatbot() {
  const chatbotContainer = document.getElementById("chatbot-container");
  const openChatbot = document.getElementById("open-chatbot");
  const closeChatbot = document.getElementById("close-chatbot");
  const minimizeChatbot = document.getElementById("minimize-chatbot");
  const sendButton = document.getElementById("send-message");
  const userInput = document.getElementById("user-message");
  const voiceButton = document.getElementById("voice-input");
  const suggestionButtons = document.querySelectorAll(".suggestion-btn");

  // Open chatbot
  openChatbot.addEventListener("click", () => {
    chatbotContainer.style.display = "flex";
    setTimeout(() => {
      chatbotContainer.classList.add("visible");
      openChatbot.style.display = "none";
    }, 10);

    // Scroll to bottom when opening
    setTimeout(() => {
      const messages = document.getElementById("chatbot-messages");
      messages.scrollTop = messages.scrollHeight;
    }, 300);
  });

  // Close chatbot
  closeChatbot.addEventListener("click", () => {
    chatbotContainer.classList.remove("visible");
    setTimeout(() => {
      chatbotContainer.style.display = "none";
      openChatbot.style.display = "block";
    }, 300);
  });

  // Minimize chatbot
  minimizeChatbot.addEventListener("click", () => {
    chatbotContainer.classList.toggle("minimized");
    minimizeChatbot.innerHTML = chatbotContainer.classList.contains("minimized")
      ? '<i class="fas fa-plus"></i>'
      : '<i class="fas fa-minus"></i>';
  });

  // Send message on button click
  sendButton.addEventListener("click", sendMessage);

  // Send message on Enter key
  userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
  });

  // Voice input
  voiceButton.addEventListener("click", toggleVoiceInput);

  // Quick suggestions
  suggestionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const text = button.textContent;
      document.getElementById("user-message").value = text;
      sendMessage();
    });
  });

  // Welcome message
  setTimeout(() => {
    addMessage(
      "Hi there! I'm your AI travel assistant. Ask me about any place or click on a location to get started.",
      "bot"
    );
  }, 1000);
}

function initEventListeners() {
  // Search button
  document
    .getElementById("searchButton")
    .addEventListener("click", searchAttractions);

  // Sort options
  document
    .getElementById("sort-select")
    .addEventListener("change", function () {
      if (markers.length > 0) {
        sortResults(this.value);
      }
    });

  // Theme toggle
  document
    .getElementById("theme-toggle")
    .addEventListener("click", toggleTheme);

  // Current location button
  document
    .getElementById("current-location")
    .addEventListener("click", locateUser);

  // Zoom controls
  document.getElementById("zoom-in").addEventListener("click", () => {
    map.setZoom(map.getZoom() + 1);
  });

  document.getElementById("zoom-out").addEventListener("click", () => {
    map.setZoom(map.getZoom() - 1);
  });
}

function initMapControls() {
  // Custom zoom controls
  const zoomControlDiv = document.createElement("div");
  const zoomControl = new ZoomControl(zoomControlDiv, map);

  zoomControlDiv.index = 1;
  map.controls[google.maps.ControlPosition.RIGHT_CENTER].push(zoomControlDiv);
}

function ZoomControl(controlDiv, map) {
  const zoomInButton = document.createElement("div");
  const zoomOutButton = document.createElement("div");

  // Set CSS for the control border
  controlDiv.style.borderRadius = "8px";
  controlDiv.style.boxShadow = "0 2px 6px rgba(0,0,0,0.3)";
  controlDiv.style.margin = "10px";

  // Set CSS for the zoom-in control
  zoomInButton.style.backgroundColor = "#fff";
  zoomInButton.style.borderRadius = "8px 8px 0 0";
  zoomInButton.style.boxShadow = "0 1px 4px rgba(0,0,0,0.2)";
  zoomInButton.style.cursor = "pointer";
  zoomInButton.style.padding = "8px";
  zoomInButton.style.textAlign = "center";
  zoomInButton.title = "Zoom in";
  zoomInButton.innerHTML = '<i class="fas fa-plus" style="color:#4361ee;"></i>';
  controlDiv.appendChild(zoomInButton);

  // Set CSS for the zoom-out control
  zoomOutButton.style.backgroundColor = "#fff";
  zoomOutButton.style.borderRadius = "0 0 8px 8px";
  zoomOutButton.style.boxShadow = "0 1px 4px rgba(0,0,0,0.2)";
  zoomOutButton.style.cursor = "pointer";
  zoomOutButton.style.padding = "8px";
  zoomOutButton.style.textAlign = "center";
  zoomOutButton.title = "Zoom out";
  zoomOutButton.innerHTML =
    '<i class="fas fa-minus" style="color:#4361ee;"></i>';
  controlDiv.appendChild(zoomOutButton);

  // Zoom in when the zoom-in button is clicked
  zoomInButton.addEventListener("click", function () {
    map.setZoom(map.getZoom() + 1);
  });

  // Zoom out when the zoom-out button is clicked
  zoomOutButton.addEventListener("click", function () {
    map.setZoom(map.getZoom() - 1);
  });
}

// ======================
// Theme Management
// ======================
function checkThemePreference() {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const savedTheme = localStorage.getItem("theme");

  if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
    document.body.classList.add("dark-mode");
    document.getElementById("theme-toggle").innerHTML =
      '<i class="fas fa-sun"></i>';
  }
}

function toggleTheme() {
  const themeToggle = document.getElementById("theme-toggle");
  document.body.classList.toggle("dark-mode");

  if (document.body.classList.contains("dark-mode")) {
    themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    localStorage.setItem("theme", "dark");
  } else {
    themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    localStorage.setItem("theme", "light");
  }
}

// ======================
// Location Functions
// ======================
function locateUser() {
  if (navigator.geolocation) {
    showLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        map.setCenter(userLocation);
        map.setZoom(14);

        // Reverse geocode to get address
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: userLocation }, (results, status) => {
          showLoading(false);
          if (status === "OK" && results[0]) {
            document.getElementById("locationInput").value =
              results[0].formatted_address;
            searchAttractions();
          }
        });
      },
      (error) => {
        showLoading(false);
        console.error("Error getting location:", error);
        addMessage(
          "Couldn't access your location. Please make sure location services are enabled.",
          "bot"
        );
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  } else {
    addMessage("Geolocation is not supported by your browser.", "bot");
  }
}

function searchAttractions() {
  const locationInput = document.getElementById("locationInput").value.trim();
  const resultList = document.getElementById("results");

  if (!locationInput) {
    showLocationNotFoundMessage();
    return;
  }

  showLoading(true);
  resultList.innerHTML =
    '<li class="loading-item">Searching attractions...</li>';

  const geocoder = new google.maps.Geocoder();
  geocoder.geocode({ address: locationInput }, (geoResults, geoStatus) => {
    if (geoStatus === "OK" && geoResults[0]) {
      const location = geoResults[0].geometry.location;
      map.setZoom(14);
      map.setCenter(location);
      clearMarkers();
      infoWindow = new google.maps.InfoWindow();

      const request = {
        location: location,
        radius: 5000,
        types: ["tourist_attraction", "museum", "landmark"],
        keyword: "tourist attraction|landmark|historical|must see|popular",
      };

      placesService.nearbySearch(request, (results, status) => {
        showLoading(false);
        resultList.innerHTML = "";
        if (
          status === google.maps.places.PlacesServiceStatus.OK &&
          results.length > 0
        ) {
          displayResults(results);
        } else {
          showNoResultsMessage();
        }
      });
    } else {
      showLoading(false);
      showLocationNotFoundMessage();
    }
  });
}

function clearMarkers() {
  markers.forEach((marker) => marker.setMap(null));
  markers = [];
}

function displayResults(results) {
  const resultList = document.getElementById("results");

  // Sort by selected option
  const sortBy = document.getElementById("sort-select").value;
  sortResults(sortBy, results);
}

function sortResults(sortBy, resultsToSort) {
  const results =
    resultsToSort ||
    Array.from(document.getElementById("results").children)
      .map((li) => {
        const placeId = li.getAttribute("data-place-id");
        return markers.find((m) => m.place.place_id === placeId)?.place;
      })
      .filter(Boolean);

  if (!results || results.length === 0) return;

  // Clear current results
  const resultList = document.getElementById("results");
  resultList.innerHTML = "";

  // Sort based on criteria
  let sortedResults;
  switch (sortBy) {
    case "rating":
      sortedResults = [...results].sort((a, b) => {
        const ratingDiff = (b.rating || 0) - (a.rating || 0);
        if (ratingDiff !== 0) return ratingDiff;
        return (b.user_ratings_total || 0) - (a.user_ratings_total || 0);
      });
      break;
    case "distance":
      if (!currentChatPlace) {
        sortedResults = results;
        break;
      }
      sortedResults = [...results].sort((a, b) => {
        const distA = google.maps.geometry.spherical.computeDistanceBetween(
          new google.maps.LatLng(a.geometry.location),
          new google.maps.LatLng(currentChatPlace.geometry.location)
        );
        const distB = google.maps.geometry.spherical.computeDistanceBetween(
          new google.maps.LatLng(b.geometry.location),
          new google.maps.LatLng(currentChatPlace.geometry.location)
        );
        return distA - distB;
      });
      break;
    case "reviews":
      sortedResults = [...results].sort(
        (a, b) => (b.user_ratings_total || 0) - (a.user_ratings_total || 0)
      );
      break;
    default:
      sortedResults = results;
  }

  // Recreate markers and list items
  clearMarkers();
  sortedResults.forEach((place) => {
    const marker = createMarker(place);
    createResultListItem(place, marker);
  });
}

function createMarker(place) {
  const marker = new google.maps.Marker({
    position: place.geometry.location,
    map: map,
    title: place.name,
    icon: {
      url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
      scaledSize: new google.maps.Size(32, 32),
    },
    place: place,
  });

  marker.addListener("click", () => {
    // Highlight the corresponding list item
    document.querySelectorAll("#results li").forEach((li) => {
      li.classList.remove("active");
      if (li.getAttribute("data-place-id") === place.place_id) {
        li.classList.add("active");
        li.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    });

    currentImageIndex = 0;
    currentPlaceId = place.place_id;
    currentChatPlace = null; // Reset before loading new data
    showPlaceDetails(place, marker);
  });

  markers.push(marker);
  return marker;
}

function createResultListItem(place, marker) {
  const resultList = document.getElementById("results");
  const li = document.createElement("li");
  li.setAttribute("data-place-id", place.place_id);

  li.onclick = () => {
    map.panTo(marker.getPosition());
    li.classList.add("active");
    currentImageIndex = 0;
    currentPlaceId = place.place_id;
    currentChatPlace = null; // Reset before loading new data
    showPlaceDetails(place, marker);
  };

  const photoHtml =
    place.photos && place.photos.length > 0
      ? `<img src="${place.photos[0].getUrl({
          maxWidth: 80,
          maxHeight: 80,
        })}" alt="${place.name}">`
      : `<div class="no-photo-placeholder"><i class="fas fa-landmark"></i></div>`;

  li.innerHTML = `
    ${photoHtml}
    <div class="place-info">
      <strong>${place.name}</strong>
      <div class="place-meta">
        ${
          place.rating
            ? `<span class="rating">★ ${place.rating.toFixed(1)}</span>`
            : '<span class="no-rating">Not rated</span>'
        }
        ${
          place.user_ratings_total
            ? `<span class="review-count">(${place.user_ratings_total})</span>`
            : ""
        }
      </div>
      <div class="place-address">${place.vicinity || ""}</div>
    </div>
    <div class="place-arrow">
      <i class="fas fa-chevron-right"></i>
    </div>
  `;
  resultList.appendChild(li);
}

async function showPlaceDetails(place, marker) {
  currentPlaceImages = place.photos || [];
  currentImageIndex = 0;

  try {
    const placeDetails = await fetchCompletePlaceDetails(place.place_id);
    currentChatPlace = placeDetails || place; // Fallback to basic info if details fail
    renderPlaceInfo(currentChatPlace, marker);

    // Add to chat history as context
    addMessage(`User selected: ${currentChatPlace.name}`, "system");
  } catch (error) {
    console.error("Error fetching place details:", error);
    currentChatPlace = place; // Use basic info if details fail
    renderPlaceInfo(place, marker);
  }
}

async function fetchCompletePlaceDetails(placeId) {
  return new Promise((resolve) => {
    const detailRequest = {
      placeId,
      fields: [
        "name",
        "formatted_address",
        "formatted_phone_number",
        "rating",
        "user_ratings_total",
        "opening_hours",
        "website",
        "price_level",
        "photos",
        "types",
        "url",
        "geometry",
      ],
    };

    placesService.getDetails(detailRequest, (place, status) => {
      if (status === "OK") {
        // Enhance with fallback data
        if (!place.formatted_address && place.vicinity) {
          place.formatted_address = place.vicinity;
        }
        resolve(place);
      } else {
        resolve(null);
      }
    });
  });
}

// ======================
// UI Rendering Functions
// ======================
function renderPlaceInfo(place, marker) {
  const content = `
    <div class="info-window">
      <div class="info-header">${place.name}</div>
      <div class="info-content">
        ${createImagesHtml(place)}
        <div class="info-details">
          ${createDetailRow(
            "Address:",
            place.formatted_address || place.vicinity || "Not available"
          )}
          ${createDetailRow(
            "Phone:",
            place.formatted_phone_number || "Not available"
          )}
          ${createRatingRow(place)}
          ${createDetailRow("Price:", createPriceHtml(place))}
          ${createDetailRow("Hours:", createHoursHtml(place))}
          ${place.website ? createWebsiteRow(place.website) : ""}
          ${place.url ? createMapsLinkRow(place.url) : ""}
        </div>
      </div>
    </div>
  `;

  displayInfoWindow(content, marker);
}

function createImagesHtml(place) {
  if (currentPlaceImages.length === 0) {
    return createNoPhotosHtml(
      '<i class="fas fa-camera"></i> No photos available'
    );
  }

  try {
    return `
      <div class="info-image-container">
        <img class="info-image" src="${currentPlaceImages[
          currentImageIndex
        ].getUrl({
          maxWidth: 500,
          maxHeight: 300,
        })}" alt="${place.name}">
        ${
          currentPlaceImages.length > 1
            ? `
          <button class="image-nav prev-btn" onclick="event.stopPropagation();navigateImage(-1)"><i class="fas fa-chevron-left"></i></button>
          <button class="image-nav next-btn" onclick="event.stopPropagation();navigateImage(1)"><i class="fas fa-chevron-right"></i></button>
          <div class="image-counter">${currentImageIndex + 1}/${
                currentPlaceImages.length
              }</div>
        `
            : ""
        }
      </div>
    `;
  } catch (e) {
    console.error("Error loading photo:", e);
    return createNoPhotosHtml(
      '<i class="fas fa-exclamation-triangle"></i> Photo unavailable'
    );
  }
}

function createNoPhotosHtml(message) {
  return `<div class="info-image-container no-photos-container">${message}</div>`;
}

function createHoursHtml(place) {
  if (!place.opening_hours?.weekday_text) {
    return '<span class="no-data">Not available</span>';
  }

  return `
    <div class="hours-container">
      ${place.opening_hours.weekday_text
        .map(
          (day) => `
        <div class="hour-row">
          <span>${day.split(":")[0]}</span>
          <span>${day.split(":")[1] || ""}</span>
        </div>
      `
        )
        .join("")}
    </div>
  `;
}

function createPriceHtml(place) {
  return place.price_level !== undefined
    ? `<span class="price">${
        ["Free", "Inexpensive", "Moderate", "Expensive", "Very Expensive"][
          place.price_level
        ] || "Varies"
      } (${"$".repeat(place.price_level + 1)})</span>`
    : '<span class="no-data">Not available</span>';
}

function createDetailRow(label, value) {
  return `
    <div class="detail-row">
      <div class="detail-label">${label}</div>
      <div class="detail-value">${value}</div>
    </div>
  `;
}

function createRatingRow(place) {
  return createDetailRow(
    "Rating:",
    place.rating
      ? `<span class="rating">★ ${place.rating.toFixed(1)}</span>${
          place.user_ratings_total
            ? ` <span class="rating-count">(${place.user_ratings_total} reviews)</span>`
            : ""
        }`
      : '<span class="no-data">Not rated</span>'
  );
}

function createWebsiteRow(website) {
  return createDetailRow(
    "Website:",
    `<a href="${website}" target="_blank" class="website-link"><i class="fas fa-external-link-alt"></i> Visit Website</a>`
  );
}

function createMapsLinkRow(url) {
  return createDetailRow(
    "View on:",
    `<a href="${url}" target="_blank" class="maps-link"><i class="fab fa-google"></i> Google Maps</a>`
  );
}

function displayInfoWindow(content, marker) {
  if (!infoWindow) {
    infoWindow = new google.maps.InfoWindow({ maxWidth: 350 });
  }
  infoWindow.setContent(content);
  positionInfoWindow(marker);
}

function positionInfoWindow(marker) {
  const newPosition = calculateProperPosition(marker);
  infoWindow.setPosition(newPosition);
  infoWindow.open(map);

  const bounds = new google.maps.LatLngBounds();
  bounds.extend(marker.getPosition());
  bounds.extend(newPosition);
  map.fitBounds(bounds, { maxZoom: map.getZoom() });
}

function calculateProperPosition(marker) {
  const mapDiv = map.getDiv();
  const mapWidth = mapDiv.offsetWidth;
  const mapHeight = mapDiv.offsetHeight;
  const overlay = new google.maps.OverlayView();

  overlay.draw = function () {};
  overlay.setMap(map);

  const projection = overlay.getProjection();
  if (!projection) return marker.getPosition();

  const markerPoint = projection.fromLatLngToContainerPixel(
    marker.getPosition()
  );
  const infoWindowWidth = 350;
  const infoWindowHeight = 500;

  let offsetX = -infoWindowWidth / 2;
  let offsetY = -infoWindowHeight - 30;

  if (markerPoint.x + offsetX < 10) offsetX = -markerPoint.x + 10;
  if (markerPoint.x + offsetX + infoWindowWidth > mapWidth - 10)
    offsetX = mapWidth - markerPoint.x - infoWindowWidth - 10;
  if (markerPoint.y + offsetY < 10) offsetY = -markerPoint.y + 10;
  if (markerPoint.y + offsetY + infoWindowHeight > mapHeight - 10)
    offsetY = mapHeight - markerPoint.y - infoWindowHeight - 10;

  return projection.fromContainerPixelToLatLng(
    new google.maps.Point(markerPoint.x + offsetX, markerPoint.y + offsetY)
  );
}

function navigateImage(direction) {
  if (currentPlaceImages.length <= 1) return;

  currentImageIndex =
    (currentImageIndex + direction + currentPlaceImages.length) %
    currentPlaceImages.length;

  const marker = markers.find((m) => m.place?.place_id === currentPlaceId);
  if (marker) renderPlaceInfo(marker.place, marker);
}

function showNoResultsMessage() {
  document.getElementById("results").innerHTML =
    '<li class="loading-item" style="text-align:center;color:#666;padding:30px;"><i class="fas fa-map-marked-alt" style="font-size:24px;margin-bottom:10px;display:block;"></i>No attractions found. Try a different location or broader search.</li>';
}

function showLocationNotFoundMessage() {
  document.getElementById("results").innerHTML =
    '<li class="loading-item" style="text-align:center;color:#666;padding:30px;"><i class="fas fa-exclamation-circle" style="font-size:24px;margin-bottom:10px;display:block;"></i>Location not found. Please check the spelling and try again.</li>';
}

// ======================
// Chatbot Functions
// ======================
async function sendMessage() {
  const userInput = document.getElementById("user-message");
  const message = userInput.value.trim();
  if (!message) return;

  addMessage(message, "user");
  userInput.value = "";
  showTypingIndicator();

  try {
    const response = await getGeminiResponse(message);
    addMessage(response, "bot");
  } catch (error) {
    console.error("Chat error:", error);
    addMessage(
      "I'm having trouble responding right now. Please try again later.",
      "bot"
    );
  } finally {
    removeTypingIndicator();
    // Scroll to bottom after adding message
    setTimeout(() => {
      const messages = document.getElementById("chatbot-messages");
      messages.scrollTop = messages.scrollHeight;
    }, 100);
  }
}

async function getGeminiResponse(userMessage) {
  if (!currentChatPlace) {
    return "Please select a place on the map first to ask questions about it. Click on any marker to get started!";
  }

  // Check for nearby places queries
  const nearbyKeywords = [
    "near",
    "nearby",
    "restaurant",
    "hotel",
    "cafe",
    "stay",
    "eat",
    "food",
    "coffee",
    "dining",
    "lodging",
  ];
  if (new RegExp(nearbyKeywords.join("|"), "i").test(userMessage)) {
    return await handleNearbyPlacesRequest(userMessage);
  }

  // Original question handling
  const placeInfo = {
    name: currentChatPlace.name,
    address:
      currentChatPlace.formatted_address ||
      currentChatPlace.vicinity ||
      "Not available",
    phone: currentChatPlace.formatted_phone_number || "Not available",
    rating: currentChatPlace.rating
      ? `${currentChatPlace.rating}★ (${
          currentChatPlace.user_ratings_total || "0"
        } reviews)`
      : "Not rated",
    price:
      currentChatPlace.price_level !== undefined
        ? `${
            ["Free", "Inexpensive", "Moderate", "Expensive", "Very Expensive"][
              currentChatPlace.price_level
            ]
          } (${"$".repeat(currentChatPlace.price_level + 1)})`
        : "Not available",
    hours:
      currentChatPlace.opening_hours?.weekday_text?.join("\n") ||
      "Not available",
    website: currentChatPlace.website || "",
    types:
      (currentChatPlace.types || [])
        .filter((t) => !["point_of_interest", "establishment"].includes(t))
        .join(", ") || "Not specified",
    url: currentChatPlace.url || "",
  };

  const prompt = `As a tour guide assistant, answer this question about ${
    placeInfo.name
  } using ONLY the following data:

  PLACE DATA:
  ${Object.entries(placeInfo)
    .filter(
      ([_, value]) =>
        value &&
        value !== "Not available" &&
        value !== "Not specified" &&
        value !== "Not rated"
    )
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n")}

  QUESTION: "${userMessage}"

  RULES:
  1. Use ONLY the data provided above
  2. For missing data say: "This information isn't available"
  3. Never apologize or make up information
  4. Keep responses concise (1-3 sentences)
  5. Format lists clearly with bullet points
  6. Include emojis when appropriate to make it friendly`;

  const response = await fetchGeminiAPI(prompt);
  return cleanResponse(response);
}

async function handleNearbyPlacesRequest(userMessage) {
  try {
    // Determine what type of places the user is asking for
    const placeTypes = [];
    if (/restaurant|eat|food|dining/i.test(userMessage))
      placeTypes.push("restaurant");
    if (/cafe|coffee|tea/i.test(userMessage)) placeTypes.push("cafe");
    if (/hotel|stay|lodging|accommodation/i.test(userMessage))
      placeTypes.push("hotel", "lodging");

    // Default to all types if none specified
    const typesToSearch =
      placeTypes.length > 0 ? placeTypes : ["restaurant", "cafe", "hotel"];

    const nearbyPlaces = await fetchNearbyPlaces(
      currentChatPlace,
      typesToSearch
    );
    return formatNearbyPlacesResponse(nearbyPlaces, currentChatPlace);
  } catch (error) {
    console.error("Error fetching nearby places:", error);
    return "I couldn't find nearby places right now. Please try again later.";
  }
}

async function fetchNearbyPlaces(place, types) {
  const radius = 500; // meters
  const results = {};

  for (const type of types) {
    const request = {
      location: place.geometry.location,
      radius: radius,
      type: type,
      rankBy: google.maps.places.RankBy.PROMINENCE,
    };

    await new Promise((resolve) => {
      placesService.nearbySearch(request, (places, status) => {
        if (status === "OK" && places.length > 0) {
          // Get full details for top 5 places
          const detailedPlaces = [];
          let processed = 0;

          const placesToProcess = places.slice(0, 5);
          if (placesToProcess.length === 0) {
            results[type] = [];
            resolve();
            return;
          }

          placesToProcess.forEach((place) => {
            placesService.getDetails(
              {
                placeId: place.place_id,
                fields: [
                  "name",
                  "formatted_address",
                  "formatted_phone_number",
                  "rating",
                  "user_ratings_total",
                  "opening_hours",
                  "price_level",
                  "url",
                  "website",
                  "geometry",
                ],
              },
              (detail, detailStatus) => {
                if (detailStatus === "OK") {
                  detailedPlaces.push({
                    name: detail.name,
                    address:
                      detail.formatted_address ||
                      detail.vicinity ||
                      "Address not available",
                    phone:
                      detail.formatted_phone_number || "Phone not available",
                    rating: detail.rating,
                    rating_count: detail.user_ratings_total,
                    price_level: detail.price_level,
                    hours: detail.opening_hours?.weekday_text || [],
                    url: detail.url,
                    website: detail.website || "",
                    distance: calculateDistance(
                      detail.geometry.location.lat(),
                      detail.geometry.location.lng(),
                      currentChatPlace.geometry.location.lat(),
                      currentChatPlace.geometry.location.lng()
                    ),
                  });
                }

                processed++;
                if (processed === placesToProcess.length) {
                  // Sort by distance and rating
                  results[type] = detailedPlaces.sort((a, b) => {
                    if (a.distance !== b.distance)
                      return a.distance - b.distance;
                    return (b.rating || 0) - (a.rating || 0);
                  });
                  resolve();
                }
              }
            );
          });
        } else {
          results[type] = [];
          resolve();
        }
      });
    });
  }
  return results;
}

function formatNearbyPlacesResponse(nearbyPlaces, currentPlace) {
  let response = `
    <div class="nearby-places-header">
      <strong>📍 Places near ${currentPlace.name}</strong>
      <div class="nearby-subtitle">(within 500 meters)</div>
    </div>
  `;

  let hasResults = false;

  for (const [type, places] of Object.entries(nearbyPlaces)) {
    if (places.length === 0) continue;
    hasResults = true;

    const typeName = type === "lodging" ? "hotel" : type;
    const icon = type === "restaurant" ? "🍽️" : type === "cafe" ? "☕" : "🏨";

    response += `
      <div class="nearby-category">
        <div class="category-header">
          ${icon} <strong>${
      typeName.charAt(0).toUpperCase() + typeName.slice(1)
    }s</strong>
        </div>
        <div class="places-list">
          ${places.map((place) => formatPlaceCard(place)).join("")}
        </div>
      </div>
    `;
  }

  if (!hasResults) {
    return `
      <div class="nearby-places-header">
        <strong>📍 Places near ${currentPlace.name}</strong>
      </div>
      <div class="no-nearby">
        <i class="fas fa-map-marker-alt"></i> No nearby places found within 500 meters.
        Try searching in a different area or expanding the search radius.
      </div>
    `;
  }

  return response;
}

function formatPlaceCard(place) {
  const priceSymbols =
    place.price_level !== undefined
      ? '<span class="price-level">' +
        "$".repeat(place.price_level + 1) +
        "</span>"
      : '<span class="no-data">Price not available</span>';

  const rating = place.rating
    ? `<div class="place-rating">★ ${place.rating.toFixed(1)} 
       <span class="rating-count">(${
         place.rating_count || "?"
       } reviews)</span></div>`
    : '<div class="no-rating">No ratings</div>';

  const hours =
    place.hours.length > 0
      ? `<div class="place-hours">
         <strong>Hours:</strong>
         ${place.hours
           .slice(0, 3)
           .map((h) => `<div>${h}</div>`)
           .join("")}
         ${place.hours.length > 3 ? "<div>...</div>" : ""}
       </div>`
      : "";

  const phone =
    place.phone !== "Phone not available"
      ? `<div class="place-phone">📞 ${place.phone}</div>`
      : "";

  const website = place.website
    ? `<a href="${place.website}" target="_blank" class="place-website">🌐 Visit Website</a>`
    : "";

  return `
    <div class="place-card">
      <div class="place-header">
        <a href="${place.url}" target="_blank" class="place-name">${place.name}</a>
        <div class="place-distance">${place.distance}m away</div>
      </div>
      
      <div class="place-address">🏠 ${place.address}</div>
      
      <div class="place-meta">
        ${rating}
        ${priceSymbols}
      </div>
      
      ${phone}
      ${hours}
      
      <div class="place-links">
        <a href="${place.url}" target="_blank" class="place-map-link">🗺️ View on Map</a>
        ${website}
      </div>
    </div>
  `;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 1000); // Distance in meters
}

// ======================
// Utility Functions
// ======================
async function fetchGeminiAPI(prompt) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      }),
    }
  );

  const data = await response.json();
  return (
    data.candidates?.[0]?.content?.parts?.[0]?.text ||
    "I couldn't generate a response. Please try another question."
  );
}

function cleanResponse(text) {
  // Remove unnecessary apologies and qualifiers
  return text
    .replace(
      /\b(unfortunately|sorry|apologize|I don't have|I don't know)\b/gi,
      ""
    )
    .replace(/\s{2,}/g, " ")
    .trim();
}

function addMessage(text, sender) {
  const messagesContainer = document.getElementById("chatbot-messages");
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${sender}-message`;
  messageDiv.innerHTML = text;
  messagesContainer.appendChild(messageDiv);

  // Add to chat history
  chatHistory.push({
    sender,
    text,
    timestamp: new Date(),
    place: currentChatPlace?.name || null,
  });
}

function showTypingIndicator() {
  const messagesContainer = document.getElementById("chatbot-messages");
  const typingDiv = document.createElement("div");
  typingDiv.className = "typing-indicator";
  typingDiv.id = "typing-indicator";
  typingDiv.innerHTML = `
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
    <div class="typing-dot"></div>
  `;
  messagesContainer.appendChild(typingDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function removeTypingIndicator() {
  const typingIndicator = document.getElementById("typing-indicator");
  if (typingIndicator) typingIndicator.remove();
}

function toggleVoiceInput() {
  if (!("webkitSpeechRecognition" in window)) {
    addMessage("Voice input isn't supported in your browser", "bot");
    return;
  }

  const voiceButton = document.getElementById("voice-input");

  if (isListening) {
    stopVoiceInput();
    voiceButton.classList.remove("listening");
    voiceButton.innerHTML = '<i class="fas fa-microphone"></i>';
  } else {
    startVoiceInput();
    voiceButton.classList.add("listening");
    voiceButton.innerHTML = '<i class="fas fa-microphone-slash"></i>';
  }

  isListening = !isListening;
}

function startVoiceInput() {
  recognition = new webkitSpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    document.getElementById("voice-input").innerHTML =
      '<i class="fas fa-microphone-slash"></i>';
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    document.getElementById("user-message").value = transcript;
    stopVoiceInput();
    sendMessage();
  };

  recognition.onerror = (event) => {
    console.error("Voice recognition error:", event.error);
    stopVoiceInput();
    addMessage("Voice input failed. Please try again.", "bot");
  };

  recognition.onend = () => {
    stopVoiceInput();
  };

  recognition.start();
}

function stopVoiceInput() {
  if (recognition) {
    recognition.stop();
  }
  document.getElementById("voice-input").innerHTML =
    '<i class="fas fa-microphone"></i>';
  document.getElementById("voice-input").classList.remove("listening");
  isListening = false;
}

function showLoading(show) {
  const overlay = document.getElementById("loading-overlay");
  if (show) {
    overlay.classList.add("active");
  } else {
    overlay.classList.remove("active");
  }
}

// Add this to your JavaScript code
document.querySelector('.results-scroller').addEventListener('wheel', function(e) {
  // Only prevent default if we're actually scrolling the results (not at top/bottom)
  const { scrollTop, scrollHeight, clientHeight } = this;
  const atTop = scrollTop === 0 && e.deltaY < 0;
  const atBottom = scrollTop + clientHeight === scrollHeight && e.deltaY > 0;
  
  if (!atTop && !atBottom) {
    e.stopPropagation();
  }
});