// Get references to the HTML elements
const fileInput = document.getElementById('fileInput');
const fileName = document.getElementById('fileName');
const resultBox = document.getElementById('resultBox');

// Store parsed CSV data and coordinates globally
let csvData = [];
let coordinatesDB = {};

// Load coordinates from JSON file
async function loadCoordinates() {
  try {
    const response = await fetch('coordinates.json');
    coordinatesDB = await response.json();
    console.log('Coordinates database loaded successfully');
  } catch (error) {
    console.error('Error loading coordinates:', error);
    resultBox.value = 'Error: Could not load coordinates database';
  }
}

// Load coordinates when page loads
loadCoordinates();

// Add event listener for file selection
fileInput.addEventListener('change', handleFileSelect);

function handleFileSelect(event) {
  const file = event.target.files[0];
  
  // Check if a file was selected
  if (!file) {
    fileName.textContent = 'No file selected';
    resultBox.value = '';
    return;
  }
  
  // Check if it's a CSV file
  if (!file.name.toLowerCase().endsWith('.csv')) {
    fileName.textContent = 'Please select a CSV file';
    resultBox.value = 'Error: Please select a .csv file';
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
  };
  
  reader.readAsText(file);
}

function parseCSV(csvContent) {
  const lines = csvContent.split(/\r?\n/);
  const result = [];
  
  // Filter out empty lines
  const nonEmptyLines = lines.filter(line => line.trim() !== '');
  
  if (nonEmptyLines.length === 0) return result;
  
  // Simple CSV parsing - split by comma (doesn't handle quoted commas)
  const headers = nonEmptyLines[0].split(',').map(h => h.trim());
  
  for (let i = 1; i < nonEmptyLines.length; i++) {
    const values = nonEmptyLines[i].split(',').map(v => v.trim());
    const row = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    result.push(row);
  }
  
  return result;
}

function findLocationColumns(headers) {
  // Convert headers to lowercase for case-insensitive matching
  const lowerHeaders = headers.map(h => h.toLowerCase());
  
  const cityIndex = lowerHeaders.indexOf('city');
  const stateIndex = lowerHeaders.indexOf('state');
  const addressIndex = lowerHeaders.indexOf('address');
  
  return {
    hasCity: cityIndex !== -1,
    hasState: stateIndex !== -1,
    hasAddress: addressIndex !== -1,
    cityColumn: cityIndex !== -1 ? headers[cityIndex] : null,
    stateColumn: stateIndex !== -1 ? headers[stateIndex] : null,
    addressColumn: addressIndex !== -1 ? headers[addressIndex] : null
  };
}

function extractLocation(row, locationInfo) {
  // If we have both city and state columns, use them
  if (locationInfo.hasCity && locationInfo.hasState) {
    const city = row[locationInfo.cityColumn] || '';
    const state = row[locationInfo.stateColumn] || '';
    if (city && state) {
      return `${city}, ${state}`;
    }
  }
  
  // Otherwise, use address column if available
  if (locationInfo.hasAddress) {
    return row[locationInfo.addressColumn] || '';
  }
  
  return '';
}

function matchLocations(uniqueLocations) {
  const results = {
    matched: [],
    unmatched: []
  };
  
  // Convert coordinate database keys to lowercase for matching
  const lowerCaseDB = {};
  for (const key in coordinatesDB) {
    lowerCaseDB[key.toLowerCase()] = coordinatesDB[key];
  }
  
  uniqueLocations.forEach(location => {
    const lowerLocation = location.toLowerCase();
    if (lowerCaseDB[lowerLocation]) {
      results.matched.push(location);
    } else {
      results.unmatched.push(location);
    }
  });
  
  return results;
}

function processCSV(csvContent) {
  try {
    // Parse CSV
    csvData = parseCSV(csvContent);
    
    if (csvData.length === 0) {
      resultBox.value = 'Error: No data found in CSV file';
      return;
    }
    
    // Get headers and find location columns
    const headers = Object.keys(csvData[0]);
    const locationInfo = findLocationColumns(headers);
    
    // Check if we have location columns
    if (!locationInfo.hasCity && !locationInfo.hasState && !locationInfo.hasAddress) {
      resultBox.value = 'Error: No location columns found (city, state, or address)';
      return;
    }
    
    // Extract unique locations
    const locationSet = new Set();
    csvData.forEach(row => {
      const location = extractLocation(row, locationInfo);
      if (location) {
        locationSet.add(location);
      }
    });
    
    const uniqueLocations = Array.from(locationSet);
    
    // Match locations with coordinates database
    const matchResults = matchLocations(uniqueLocations);
    
    // Display results
    let output = `File loaded successfully!\n`;
    output += `Number of candidates: ${csvData.length}\n`;
    output += `Number of unique locations: ${uniqueLocations.length}\n`;
    output += `Locations matched: ${matchResults.matched.length}\n`;
    output += `Locations not matched: ${matchResults.unmatched.length}\n`;
    
    if (matchResults.unmatched.length > 0) {
      output += `\nUnmatched locations:\n`;
      matchResults.unmatched.forEach(loc => {
        output += `- ${loc}\n`;
      });
    }
    
    resultBox.value = output;
    
  } catch (error) {
    resultBox.value = 'Error: Could not process the CSV file';
    console.error('CSV processing error:', error);
  }
}