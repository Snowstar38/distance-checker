// Get references to the HTML elements
const fileInput = document.getElementById('fileInput');
const fileName = document.getElementById('fileName');
const resultBox = document.getElementById('resultBox');
const unmatchedBox = document.getElementById('unmatchedBox');
const distanceField = document.getElementById('distanceField');
const coordinatesField = document.getElementById('coordinatesField');
const runButton = document.getElementById('runButton');
const saveButton = document.getElementById('saveButton');

// Global variables to store data
let coordinatesDB = null;
let processedCSVData = null;
let filteredResults = null;

// State name to abbreviation mapping
const stateMapping = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR', 'california': 'CA',
  'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE', 'florida': 'FL', 'georgia': 'GA',
  'hawaii': 'HI', 'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA',
  'kansas': 'KS', 'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
  'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS', 'missouri': 'MO',
  'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
  'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH',
  'oklahoma': 'OK', 'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT', 'vermont': 'VT',
  'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY',
  'district of columbia': 'DC'
};

// Load coordinates database on page load
window.addEventListener('DOMContentLoaded', async () => {
  try {
    const response = await fetch('coordinates.json');
    coordinatesDB = await response.json();
    console.log('Coordinates database loaded successfully');
  } catch (error) {
    console.error('Failed to load coordinates database:', error);
    resultBox.value = 'Error: Could not load coordinates database';
  }
});

// Add event listeners
fileInput.addEventListener('change', handleFileSelect);
runButton.addEventListener('click', handleRunButton);
saveButton.addEventListener('click', handleSaveButton);

// Add coordinate field auto-rounding functionality
coordinatesField.addEventListener('paste', handleCoordinatePaste);
coordinatesField.addEventListener('input', handleCoordinateInput);

function handleCoordinatePaste(event) {
  // Let the paste happen first, then process
  setTimeout(() => {
    roundCoordinates();
  }, 0);
}

function handleCoordinateInput(event) {
  // Only round if it looks like coordinates were pasted (contains many decimal places)
  const value = event.target.value;
  if (value.includes(',') && value.match(/\d+\.\d{5,}/)) {
    roundCoordinates();
  }
}

function roundCoordinates() {
  const value = coordinatesField.value.trim();
  
  // Check if it looks like coordinates (lat, lon format)
  const coordsMatch = value.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  
  if (coordsMatch) {
    const lat = parseFloat(coordsMatch[1]);
    const lon = parseFloat(coordsMatch[2]);
    
    if (!isNaN(lat) && !isNaN(lon)) {
      // Round to 4 decimal places
      const roundedLat = Math.round(lat * 10000) / 10000;
      const roundedLon = Math.round(lon * 10000) / 10000;
      
      // Update the field with rounded values
      coordinatesField.value = `${roundedLat}, ${roundedLon}`;
    }
  }
}

function handleFileSelect(event) {
  const file = event.target.files[0];
  
  // Check if a file was selected
  if (!file) {
    fileName.textContent = 'No file selected';
    resultBox.value = '';
    unmatchedBox.value = '';
    processedCSVData = null;
    return;
  }
  
  // Check if it's a CSV file
  if (!file.name.toLowerCase().endsWith('.csv')) {
    fileName.textContent = 'Please select a CSV file';
    resultBox.value = 'Error: Please select a .csv file';
    unmatchedBox.value = '';
    processedCSVData = null;
    return;
  }
  
  // Update the file name display
  fileName.textContent = file.name;
  
  // Read the file
  const reader = new FileReader();
  reader.onload = function(e) {
    const csvContent = e.target.result;
    processCSV(csvContent);
  };
  
  reader.onerror = function() {
    resultBox.value = 'Error: Could not read the file';
    unmatchedBox.value = '';
    processedCSVData = null;
  };
  
  reader.readAsText(file);
}

function normalizeState(stateName) {
  if (!stateName) return '';
  
  const normalized = stateName.toLowerCase().trim();
  return stateMapping[normalized] || stateName.trim();
}

function normalizeCityName(cityName) {
  if (!cityName) return '';
  
  let normalized = cityName.trim();
  
  // Common city name normalizations - expand abbreviations to match full database
  const replacements = [
    [/\bSt\b/gi, 'Saint'],
    [/\bFt\b/gi, 'Fort'],
    [/\bMt\b/gi, 'Mount'],
    [/\bJct\b/gi, 'Junction'],
    [/\bCentre\b/gi, 'Center'],
    [/\bBoro\b/gi, 'Borough']
  ];
  
  replacements.forEach(([pattern, replacement]) => {
    normalized = normalized.replace(pattern, replacement);
  });
  
  return normalized;
}

function processCSV(csvContent) {
  try {
    // Check if coordinates database is loaded
    if (!coordinatesDB) {
      resultBox.value = 'Error: Coordinates database not loaded yet. Please try again.';
      unmatchedBox.value = '';
      return;
    }
    
    // Split the content into lines
    const lines = csvContent.split(/\r?\n/);
    
    // Filter out empty lines
    const nonEmptyLines = lines.filter(line => line.trim() !== '');
    
    if (nonEmptyLines.length === 0) {
      resultBox.value = 'Error: CSV file is empty';
      unmatchedBox.value = '';
      return;
    }
    
    // Parse header row
    const headers = parseCSVLine(nonEmptyLines[0]);
    const headerLower = headers.map(h => h.toLowerCase().trim());
    
    // Find column indices
    const cityIndex = headerLower.indexOf('city');
    const stateIndex = headerLower.indexOf('state');
    const addressIndex = headerLower.indexOf('address');
    
    // Check if we have the required columns
    if (cityIndex === -1 && stateIndex === -1 && addressIndex === -1) {
      resultBox.value = 'Error: CSV must have either "city"/"state" columns or an "address" column';
      unmatchedBox.value = '';
      return;
    }
    
    // Parse all data rows
    const candidates = [];
    const uniqueLocations = new Map(); // Use Map to store both original and normalized
    
    for (let i = 1; i < nonEmptyLines.length; i++) {
      const row = parseCSVLine(nonEmptyLines[i]);
      
      let originalLocation = '';
      let normalizedLocation = '';
      
      // Prefer city/state over address
      if (cityIndex !== -1 && stateIndex !== -1) {
        const city = row[cityIndex] ? row[cityIndex].trim() : '';
        const state = row[stateIndex] ? row[stateIndex].trim() : '';
        if (city && state) {
          originalLocation = `${city}, ${state}`;
          const normalizedCity = normalizeCityName(city);
          const normalizedState = normalizeState(state);
          normalizedLocation = `${normalizedCity}, ${normalizedState}`;
        }
      } else if (addressIndex !== -1) {
        originalLocation = row[addressIndex] ? row[addressIndex].trim() : '';
        normalizedLocation = originalLocation; // No normalization for full addresses
      }
      
      // Store candidate data
      const candidate = {
        originalRow: row,
        originalLocation: originalLocation,
        normalizedLocation: normalizedLocation,
        coordinates: null,
        distance: null
      };
      
      candidates.push(candidate);
      
      if (originalLocation) {
        uniqueLocations.set(originalLocation, normalizedLocation);
      }
    }
    
    // Match locations with coordinates database
    const matchedLocations = [];
    const unmatchedLocations = [];
    
    uniqueLocations.forEach((normalizedLocation, originalLocation) => {
      // Case-insensitive matching using normalized location
      const matched = Object.keys(coordinatesDB).find(key => 
        key.toLowerCase() === normalizedLocation.toLowerCase()
      );
      
      if (matched) {
        matchedLocations.push(originalLocation);
      } else {
        unmatchedLocations.push(originalLocation);
      }
    });
    
    // Store processed data for later use
    processedCSVData = {
      headers: headers,
      candidates: candidates,
      uniqueLocations: uniqueLocations,
      matchedLocations: matchedLocations,
      unmatchedLocations: unmatchedLocations
    };
    
    // Display the results in main result box
    let resultText = `File loaded successfully!\n`;
    resultText += `Number of candidates: ${candidates.length}\n`;
    resultText += `Unique locations found: ${uniqueLocations.size}\n`;
    resultText += `Locations matched: ${matchedLocations.length}\n`;
    resultText += `Locations not matched: ${unmatchedLocations.length}\n`;
    
    resultBox.value = resultText;
    
    // Display unmatched locations in separate box
    if (unmatchedLocations.length > 0) {
      let unmatchedText = `${unmatchedLocations.length} locations could not be matched:\n\n`;
      unmatchedLocations.forEach(loc => {
        unmatchedText += `${loc}\n`;
      });
      unmatchedBox.value = unmatchedText;
    } else {
      unmatchedBox.value = 'All locations matched successfully!';
    }
    
  } catch (error) {
    resultBox.value = 'Error: Could not process the CSV file';
    unmatchedBox.value = '';
    console.error('CSV processing error:', error);
    processedCSVData = null;
  }
}

function handleRunButton() {
  console.log('Run button clicked!'); // Debug
  
  // Check if we have processed CSV data
  if (!processedCSVData) {
    resultBox.value = 'Error: Please upload a CSV file first';
    return;
  }
  
  // Get target coordinates
  const coordsText = coordinatesField.value.trim();
  if (!coordsText) {
    resultBox.value = 'Error: Please enter target coordinates (lat, lon)';
    return;
  }
  
  // Parse coordinates
  const coordsParts = coordsText.split(',').map(s => s.trim());
  if (coordsParts.length !== 2) {
    resultBox.value = 'Error: Coordinates must be in format "lat, lon"';
    return;
  }
  
  const targetLat = parseFloat(coordsParts[0]);
  const targetLon = parseFloat(coordsParts[1]);
  
  if (isNaN(targetLat) || isNaN(targetLon)) {
    resultBox.value = 'Error: Coordinates must be valid numbers';
    return;
  }
  
  // Get maximum distance
  const maxDistanceText = distanceField.value.trim();
  if (!maxDistanceText) {
    resultBox.value = 'Error: Please enter maximum distance in miles';
    return;
  }
  
  const maxDistance = parseFloat(maxDistanceText);
  if (isNaN(maxDistance) || maxDistance <= 0) {
    resultBox.value = 'Error: Distance must be a positive number';
    return;
  }
  
  // Calculate distances for all candidates
  const candidatesWithDistance = [];
  let matchedCandidates = 0;
  let withinRadius = 0;
  
  processedCSVData.candidates.forEach(candidate => {
    if (candidate.normalizedLocation) {
      // Find matching coordinates using normalized location (case-insensitive)
      const matched = Object.keys(coordinatesDB).find(key => 
        key.toLowerCase() === candidate.normalizedLocation.toLowerCase()
      );
      
      if (matched) {
        const coords = coordinatesDB[matched];
        candidate.coordinates = coords;
        candidate.distance = haversineDistance(targetLat, targetLon, coords[0], coords[1]);
        matchedCandidates++;
        
        if (candidate.distance <= maxDistance) {
          candidatesWithDistance.push(candidate);
          withinRadius++;
        }
      }
    }
  });
  
  // Sort by distance
  candidatesWithDistance.sort((a, b) => a.distance - b.distance);
  
  // Store filtered results
  filteredResults = candidatesWithDistance;
  
  // Display results
  let resultText = `Processing complete!\n`;
  resultText += `Total candidates: ${processedCSVData.candidates.length}\n`;
  resultText += `Candidates with matched locations: ${matchedCandidates}\n`;
  resultText += `Candidates within ${maxDistance} miles: ${withinRadius}\n`;
  
  if (withinRadius > 0) {
    resultText += `\nClosest candidates:\n`;
    const displayCount = Math.min(10, withinRadius);
    for (let i = 0; i < displayCount; i++) {
      const candidate = candidatesWithDistance[i];
      resultText += `- ${candidate.originalLocation}: ${candidate.distance.toFixed(1)} miles\n`;
    }
    
    if (withinRadius > 10) {
      resultText += `... and ${withinRadius - 10} more\n`;
    }
  }
  
  resultBox.value = resultText;
}

function handleSaveButton() {
  console.log('Save button clicked!'); // Debug
  
  if (!filteredResults || filteredResults.length === 0) {
    resultBox.value = 'Error: No filtered results to save. Please run the analysis first.';
    return;
  }
  
  // Create CSV content
  const headers = [...processedCSVData.headers, 'Distance (miles)'];
  let csvContent = headers.map(h => `"${h}"`).join(',') + '\n';
  
  filteredResults.forEach(candidate => {
    const row = [...candidate.originalRow, candidate.distance.toFixed(2)];
    csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
  });
  
  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'filtered_candidates.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
  
  resultBox.value = `File saved successfully!\nDownloaded: filtered_candidates.csv\nContains ${filteredResults.length} candidates`;
}

// Haversine distance calculation (returns distance in miles)
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Earth's radius in miles
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * 
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

// Simple CSV line parser (handles basic cases)
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

// Help function placeholders (you can implement these later)
function showHelp(type) {
  console.log('Help button clicked for:', type); // Debug
  if (type === 'file') {
    alert('Upload a CSV file with candidate data. The file should have either "city" and "state" columns, or a single "address" column.');
  } else if (type === 'coordinates') {
    alert('Enter the target location coordinates in decimal format, separated by a comma. Example: 40.7128, -74.0060 (for New York City)');
  }
}