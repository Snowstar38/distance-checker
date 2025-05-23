// Get references to the HTML elements
const fileInput = document.getElementById('fileInput');
const fileName = document.getElementById('fileName');
const resultBox = document.getElementById('resultBox');

// Global variable to store coordinates database
let coordinatesDB = null;

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
    
    // Extract unique locations from data rows
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
    
    // Calculate the number of data rows (excluding header)
    const candidateCount = Math.max(0, nonEmptyLines.length - 1);
    
    // Display the results
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