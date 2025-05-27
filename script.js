// Get references to the HTML elements
const fileInput = document.getElementById('fileInput');
const fileName = document.getElementById('fileName');
const resultBox = document.getElementById('resultBox');
const distanceField = document.getElementById('distanceField');
const coordinatesField = document.getElementById('coordinatesField');
const runButton = document.getElementById('runButton');
const saveButton = document.getElementById('saveButton');

// Global variables to store data
let coordinatesDB = null;
let processedCSVData = null;
let filteredResults = null;

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

function handleFileSelect(event) {
  const file = event.target.files[0];
  
  // Check if a file was selected
  if (!file) {
    fileName.textContent = 'No file selected';
    resultBox.value = '';
    processedCSVData = null;
    return;
  }
  
  // Check if it's a CSV file
  if (!file.name.toLowerCase().endsWith('.csv')) {
    fileName.textContent = 'Please select a CSV file';
    resultBox.value = 'Error: Please select a .csv file';
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
    processedCSVData = null;
  };
  
  reader.readAsText(file);
}

function processCSV(csvContent) {
  try {
    // Check if coordinates database is loaded
    if (!coordinatesDB) {
      resultBox.value = 'Error: Coordinates database not loaded yet. Please try again.';
      return;
    }
    
    // Split the content into lines
    const lines = csvContent.split(/\r?\n/);
    
    // Filter out empty lines
    const nonEmptyLines = lines.filter(line => line.trim() !== '');
    
    if (nonEmptyLines.length === 0) {
      resultBox.value = 'Error: CSV file is empty';
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
      return;
    }
    
    // Parse all data rows
    const candidates = [];
    const uniqueLocations = new Set();
    
    for (let i = 1; i < nonEmptyLines.length; i++) {
      const row = parseCSVLine(nonEmptyLines[i]);
      
      let location = '';
      
      // Prefer city/state over address
      if (cityIndex !== -1 && stateIndex !== -1) {
        const city = row[cityIndex] ? row[cityIndex].trim() : '';
        const state = row[stateIndex] ? row[stateIndex].trim() : '';
        if (city && state) {
          location = `${city}, ${state}`;
        }
      } else if (addressIndex !== -1) {
        location = row[addressIndex] ? row[addressIndex].trim() : '';
      }
      
      // Store candidate data
      const candidate = {
        originalRow: row,
        location: location,
        coordinates: null,
        distance: null
      };
      
      candidates.push(candidate);
      
      if (location) {
        uniqueLocations.add(location);
      }
    }
    
    // Match locations with coordinates database
    const matchedLocations = [];
    const unmatchedLocations = [];
    
    uniqueLocations.forEach(location => {
      // Case-insensitive matching
      const matched = Object.keys(coordinatesDB).find(key => 
        key.toLowerCase() === location.toLowerCase()
      );
      
      if (matched) {
        matchedLocations.push(location);
      } else {
        unmatchedLocations.push(location);
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
    
    // Display the results
    let resultText = `File loaded successfully!\n`;
    resultText += `Number of candidates: ${candidates.length}\n`;
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
    if (candidate.location) {
      // Find matching coordinates (case-insensitive)
      const matched = Object.keys(coordinatesDB).find(key => 
        key.toLowerCase() === candidate.location.toLowerCase()
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
    const displayCount = Math.min(5, withinRadius);
    for (let i = 0; i < displayCount; i++) {
      const candidate = candidatesWithDistance[i];
      resultText += `- ${candidate.location}: ${candidate.distance.toFixed(1)} miles\n`;
    }
    
    if (withinRadius > 5) {
      resultText += `... and ${withinRadius - 5} more\n`;
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