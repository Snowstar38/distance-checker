// Get references to the HTML elements
const fileInput = document.getElementById('fileInput');
const fileName = document.getElementById('fileName');
const resultBox = document.getElementById('resultBox');

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
    // Split the content into lines (fixed to handle both line endings)
    const lines = csvContent.split(/\r?\n/);
    
    // Filter out empty lines
    const nonEmptyLines = lines.filter(line => line.trim() !== '');
    
    // Calculate the number of data rows (excluding header)
    const candidateCount = Math.max(0, nonEmptyLines.length - 1);
    
    // Display the result
    resultBox.value = `File loaded successfully!\nNumber of candidates: ${candidateCount}`;
    
  } catch (error) {
    resultBox.value = 'Error: Could not process the CSV file';
    console.error('CSV processing error:', error);
  }
}