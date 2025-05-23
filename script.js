// Get references to the HTML elements
const fileInput = document.getElementById('fileInput');
const fileName = document.getElementById('fileName');
const resultBox = document.getElementById('resultBox');

// Store the coordinate database and CSV data globally
let coordinateDatabase = null;
let csvData = null;

// Load the coordinate database when the page loads
loadCoordinateDatabase();

async function loadCoordinateDatabase() {
  try {
    const response = await fetch('coordinates.json'); // Adjust the path as needed
    coordinateDatabase = await response.json();
    console.log(`Loaded ${Object.keys(coordinateDatabase).length} locations from database`);
  } catch (error) {
    console.error('Failed to load coordinate database:', error);
    resultBox.value = 'Error: Could not load coordinate database';
  }
}

// Add event listener for file selection
fileInput.addEventListener('change', handleFileSelect);

function handleFileSelect(event) {
  const file = event.target.files[0];
  
  // Check if a file was selected
  if (!file) {
    fileName.textContent = 'No file selected';
    resultBox.value = '';
    csvData = null;
    return;
  }
  
  // Check if it's a CSV file
  if (!file.name.toLowerCase().endsWith('.csv')) {
    fileName.textContent = 'Please select a CSV file';
    resultBox.value = 'Error: Please select a .csv file';
    csvData = null;
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
  const lines = csvContent.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length === 0) return null;
  
  // Parse header
  const header = lines[0].split(',').map(col => col.trim());
  
  // Parse data rows
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(val => val.trim());
    const row = {};
    header.forEach((col, index) => {
      row[col] = values[index] || '';
    });
    data.push(row);
  }
  
  return { header, data };
}

function findLocationColumns(header) {
  // Convert header to lowercase for case-insensitive matching
  const lowerHeader = header.map(col => col.toLowerCase());
  
  const cityIndex = lowerHeader.findIndex(col => col === 'city');
  const stateIndex = lowerHeader.findIndex(col => col === 'state');
  const addressIndex = lowerHeader.findIndex(col => col === 'address');
  
  // Return the original column names (not lowercase)
  return {
    cityCol: cityIndex !== -1 ? header[cityIndex] : null,
    stateCol: stateIndex !== -1 ? header[stateIndex] : null,
    addressCol: addressIndex !== -1 ? header[addressIndex] : null
  };
}

function extractLocation(row, locationCols) {
  // If we have city and state columns, use those (priority)
  if (locationCols.cityCol && locationCols.stateCol) {
    const city = row[locationCols.cityCol];
    const state = row[locationCols.stateCol];
    if (city && state) {
      return `${city}, ${state}`;
    }
  }
  
  // Otherwise, use address column if available
  if (locationCols.addressCol) {
    return row[locationCols.addressCol];
  }
  
  return null;
}

function processCSV(csvContent) {
  try {
    // Check if coordinate database is loaded
    if (!coordinateDatabase) {
      resultBox.value = 'Error: Coordinate database not loaded yet. Please try again.';
      return;
    }
    
    // Parse the CSV
    const parsed = parseCSV(csvContent);
    if (!parsed) {
      resultBox.value = 'Error: Could not parse the CSV file';
      return;
    }
    
    csvData = parsed;
    
    // Find location columns
    const locationCols = findLocationColumns(parsed.header);
    
    if (!locationCols.cityCol && !locationCols.stateCol && !locationCols.addressCol) {
      resultBox.value = 'Error: Could not find location columns (city/state or address)';
      return;
    }
    
    // Extract unique locations from the data
    const locationMap = new Map(); // Map to track location -> count
    
    parsed.data.forEach(row => {
      const location = extractLocation(row, locationCols);
      if (location) {
        locationMap.set(location, (locationMap.get(location) || 0) + 1);
      }
    });
    
    // Match locations with coordinate database
    let matchedCount = 0;
    let unmatchedLocations = [];
    
    locationMap.forEach((count, location) => {
      // Case-insensitive matching
      const matched = Object.keys(coordinateDatabase).find(
        dbLocation => dbLocation.toLowerCase() === location.toLowerCase()
      );
      
      if (matched) {
        matchedCount++;
      } else {
        unmatchedLocations.push(location);
      }
    });
    
    // Display results
    const uniqueLocationCount = locationMap.size;
    const unmatchedCount = unmatchedLocations.length;
    
    let resultText = `File loaded successfully!\n`;
    resultText += `Number of candidates: ${parsed.data.length}\n`;
    resultText += `Unique locations found: ${uniqueLocationCount}\n`;
    resultText += `Locations matched: ${matchedCount}\n`;
    resultText += `Locations not matched: ${unmatchedCount}\n`;
    
    if (unmatchedCount > 0) {
      resultText += `\nUnmatched locations:\n`;
      unmatchedLocations.slice(0, 10).forEach(loc => {
        resultText += `- ${loc}\n`;
      });
      if (unmatchedCount > 10) {
        resultText += `... and ${unmatchedCount - 10} more`;
      }
    }
    
    resultBox.value = resultText;
    
  } catch (error) {
    resultBox.value = 'Error: Could not process the CSV file';
    console.error('CSV processing error:', error);
  }
}