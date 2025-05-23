// Get references to the HTML elements
const fileInput = document.getElementById('fileInput');
const fileName = document.getElementById('fileName');
const distanceField = document.getElementById('distanceField');
const coordinatesField = document.getElementById('coordinatesField');
const runButton = document.getElementById('runButton');
const saveButton = document.getElementById('saveButton');
const resultBox = document.getElementById('resultBox');

// Global variables
let coordinatesDB = null;
let csvData = null;
let processedCandidates = null;

// US States and territories lookup table
const statesLookup = {
  // Full names to abbreviations
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
  'district of columbia': 'DC', 'washington dc': 'DC', 'washington d.c.': 'DC'
};

// Valid state abbreviations
const validStates = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA',
  'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT',
  'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
]);

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
runButton.addEventListener('click', handleRunClick);
saveButton.addEventListener('click', handleSaveClick);

function handleFileSelect(event) {
  const file = event.target.files[0];
  
  if (!file) {
    fileName.textContent = 'No file selected';
    resultBox.value = '';
    csvData = null;
    return;
  }
  
  if (!file.name.toLowerCase().endsWith('.csv')) {
    fileName.textContent = 'Please select a CSV file';
    resultBox.value = 'Error: Please select a .csv file';
    csvData = null;
    return;
  }
  
  fileName.textContent = file.name;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    const csvContent = e.target.result;
    processCSV(csvContent);
  };
  
  reader.onerror = function() {
    resultBox.value = 'Error: Could not read the file';
    csvData = null;
  };
  
  reader.readAsText(file);
}

function stripPuncuation(text) {
  if (!text) return '';
  return text.replace(/[.']/g, '').trim();
}

function normalizeState(state) {
  if (!state) return '';
  
  const cleanState = stripPuncuation(state).toUpperCase();
  
  // If it's already a valid abbreviation, return it
  if (validStates.has(cleanState)) {
    return cleanState;
  }
  
  // Try to find it in the lookup table
  const lowerState = cleanState.toLowerCase();
  if (statesLookup[lowerState]) {
    return statesLookup[lowerState];
  }
  
  // Return original if no match found
  return cleanState;
}

function processCSV(csvContent) {
  try {
    if (!coordinatesDB) {
      resultBox.value = 'Error: Coordinates database not loaded yet. Please try again.';
      return;
    }
    
    const lines = csvContent.split(/\r?\n/);
    const nonEmptyLines = lines.filter(line => line.trim() !== '');
    
    if (nonEmptyLines.length === 0) {
      resultBox.value = 'Error: CSV file is empty';
      return;
    }
    
    const headers = parseCSVLine(nonEmptyLines[0]);
    const headerLower = headers.map(h => h.toLowerCase().trim());
    
    const cityIndex = headerLower.indexOf('city');
    const stateIndex = headerLower.indexOf('state');
    const addressIndex = headerLower.indexOf('address');
    
    if (cityIndex === -1 && stateIndex === -1 && addressIndex === -1) {
      resultBox.value = 'Error: CSV must have either "city"/"state" columns or an "address" column';
      return;
    }
    
    // Store the CSV data for later processing
    csvData = {
      headers: headers,
      rows: [],
      cityIndex: cityIndex,
      stateIndex: stateIndex,
      addressIndex: addressIndex
    };
    
    // Process each data row
    for (let i = 1; i < nonEmptyLines.length; i++) {
      const row = parseCSVLine(nonEmptyLines[i]);
      csvData.rows.push(row);
    }
    
    // Extract and analyze unique locations
    const uniqueLocations = new Set();
    
    csvData.rows.forEach(row => {
      let location = '';
      
      if (cityIndex !== -1 && stateIndex !== -1) {
        const city = stripPuncuation(row[cityIndex] || '');
        const state = normalizeState(row[stateIndex] || '');
        if (city && state) {
          location = `${city}, ${state}`;
        }
      } else if (addressIndex !== -1) {
        location = stripPuncuation(row[addressIndex] || '');
      }
      
      if (location) {
        uniqueLocations.add(location);
      }
    });
    
    // Match locations with coordinates database
    const matchedLocations = [];
    const unmatchedLocations = [];
    
    uniqueLocations.forEach(location => {
      const matched = Object.keys(coordinatesDB).find(key => 
        key.toLowerCase() === location.toLowerCase()
      );
      
      if (matched) {
        matchedLocations.push(location);
      } else {
        unmatchedLocations.push(location);
      }
    });
    
    const candidateCount = csvData.rows.length;
    
    let resultText = `File loaded successfully!\n`;
    resultText += `Number of candidates: ${candidateCount}\n`;
    resultText += `Unique locations found: ${uniqueLocations.size}\n`;
    resultText += `Locations matched: ${matchedLocations.length}\n`;
    resultText += `Locations not matched: ${unmatchedLocations.length}\n`;
    
    if (unmatchedLocations.length > 0) {
      resultText += `\nUnmatched locations:\n`;
      unmatchedLocations.forEach(loc => {
        resultText += `- ${loc}\n`;
      });
    }
    
    resultBox.value = resultText;
    
  } catch (error) {
    resultBox.value = 'Error: Could not process the CSV file';
    console.error('CSV processing error:', error);
  }
}

function handleRunClick() {
  if (!csvData) {
    resultBox.value = 'Error: Please upload a CSV file first';
    return;
  }
  
  const coordinatesInput = coordinatesField.value.trim();
  const distanceInput = distanceField.value.trim();
  
  if (!coordinatesInput || !distanceInput) {
    resultBox.value = 'Error: Please enter both target coordinates and maximum distance';
    return;
  }
  
  // Parse coordinates (expecting "lat, lon" format)
  const coords = coordinatesInput.split(',').map(c => parseFloat(c.trim()));
  if (coords.length !== 2 || isNaN(coords[0]) || isNaN(coords[1])) {
    resultBox.value = 'Error: Please enter coordinates in "latitude, longitude" format';
    return;
  }
  
  const maxDistance = parseFloat(distanceInput);
  if (isNaN(maxDistance) || maxDistance <= 0) {
    resultBox.value = 'Error: Please enter a valid distance in miles';
    return;
  }
  
  const targetLat = coords[0];
  const targetLon = coords[1];
  
  // Process each candidate
  processedCandidates = [];
  
  csvData.rows.forEach((row, index) => {
    let location = '';
    
    // Extract location same way as before
    if (csvData.cityIndex !== -1 && csvData.stateIndex !== -1) {
      const city = stripPuncuation(row[csvData.cityIndex] || '');
      const state = normalizeState(row[csvData.stateIndex] || '');
      if (city && state) {
        location = `${city}, ${state}`;
      }
    } else if (csvData.addressIndex !== -1) {
      location = stripPuncuation(row[csvData.addressIndex] || '');
    }
    
    if (location) {
      // Find matching coordinates
      const matched = Object.keys(coordinatesDB).find(key => 
        key.toLowerCase() === location.toLowerCase()
      );
      
      if (matched) {
        const [candidateLat, candidateLon] = coordinatesDB[matched];
        const distance = haversineDistance(targetLat, targetLon, candidateLat, candidateLon);
        
        // Only include if within max distance
        if (distance <= maxDistance) {
          processedCandidates.push({
            rowData: [...row],
            location: location,
            distance: distance
          });
        }
      }
    }
  });
  
  // Sort by distance (ascending)
  processedCandidates.sort((a, b) => a.distance - b.distance);
  
  // Display results
  let resultText = `Processing complete!\n`;
  resultText += `Total candidates: ${csvData.rows.length}\n`;
  resultText += `Candidates within ${maxDistance} miles: ${processedCandidates.length}\n`;
  
  if (processedCandidates.length > 0) {
    resultText += `\nClosest candidates:\n`;
    processedCandidates.slice(0, 10).forEach((candidate, index) => {
      resultText += `${index + 1}. ${candidate.location} - ${candidate.distance.toFixed(2)} miles\n`;
    });
    
    if (processedCandidates.length > 10) {
      resultText += `... and ${processedCandidates.length - 10} more\n`;
    }
  }
  
  resultBox.value = resultText;
}

function handleSaveClick() {
  if (!processedCandidates || processedCandidates.length === 0) {
    resultBox.value = 'Error: No processed data to save. Please run the distance calculation first.';
    return;
  }
  
  // Create CSV content
  const headers = [...csvData.headers, 'Distance (miles)'];
  let csvContent = headers.join(',') + '\n';
  
  processedCandidates.forEach(candidate => {
    const row = [...candidate.rowData, candidate.distance.toFixed(2)];
    csvContent += row.map(field => `"${field}"`).join(',') + '\n';
  });
  
  // Trigger download
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'filtered_candidates.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  resultBox.value = `File saved successfully!\nExported ${processedCandidates.length} candidates to filtered_candidates.csv`;
}

// Haversine formula to calculate distance between two points
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

// Help functions (placeholder for now)
function showHelp(type) {
  if (type === 'file') {
    alert('Upload a CSV file with candidate data. The file should have either "city" and "state" columns, or a single "address" column.');
  } else if (type === 'coordinates') {
    alert('Enter the target coordinates as latitude, longitude (e.g., "40.7128, -74.0060" for New York City) and the maximum distance in miles.');
  }
}