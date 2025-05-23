# Distance Checker - Project Specification

## Overview
A web-based utility for recruiting companies to filter job candidates by proximity to job locations. Users upload a CSV of candidates, specify target coordinates and radius, then receive a filtered and sorted CSV of candidates within the specified distance.

## Core Components

### 1. Data Input
- **CSV Upload**: Candidates file with location data
- **Target Coordinates**: Latitude and longitude of job location
- **Distance Radius**: Maximum commute distance in miles

### 2. Location Database
- **Format**: Hard-coded JSON object in JavaScript
- **Structure**: `{"City, ST": [latitude, longitude], ...}`
- **Scope**: US cities and towns with coordinate pairs

### 3. CSV Processing Engine
- **Column Detection**: Auto-detect "city"+"state" OR single "address" columns
- **Location Extraction**: Generate unique location list from candidate data
- **Coordinate Matching**: Map locations to database coordinates

### 4. Distance Calculation
- **Algorithm**: Haversine formula for great-circle distance
- **Input**: Two coordinate pairs (target vs candidate location)
- **Output**: Distance in miles

### 5. Filtering & Sorting
- **Filter**: Remove candidates beyond specified radius
- **Sort**: Order remaining candidates by distance (ascending)

### 6. Export System
- **Format**: CSV file with original data + distance column
- **Download**: Browser-triggered file download

## User Flow

1. **Setup Phase**
   - User uploads candidate CSV file
   - User enters target coordinates (lat, lon)
   - User specifies maximum distance in miles

2. **Processing Phase**
   - Parse CSV and detect column structure
   - Extract unique locations from candidate data
   - Match locations to coordinate database
   - Calculate distances using Haversine formula
   - Filter candidates within specified radius
   - Sort filtered results by distance

3. **Output Phase**
   - Generate new CSV with distance column added
   - Display summary in result textarea
   - Trigger download of filtered candidate CSV

## Technical Architecture

### Files Structure
- `index.html` - User interface and layout
- `style.css` - Styling and responsive design
- `script.js` - Core application logic and coordinate database

### Key Functions (Planned)
- `parseCSV()` - Convert uploaded file to usable data structure
- `detectColumns()` - Identify location column format
- `extractLocations()` - Get unique locations from candidate data
- `matchCoordinates()` - Map locations to database coordinates
- `haversineDistance()` - Calculate distance between two points
- `filterAndSort()` - Apply radius filter and distance sorting
- `exportCSV()` - Generate and download result file

## MVP Assumptions
- All candidate locations have exact matches in database
- CSV files are properly formatted
- User inputs are valid (coordinates, distance)
- No error handling for edge cases (added in later versions)

## Future Enhancements (Post-MVP)
- Progress indicators and status updates
- Location matching error reporting
- Fuzzy matching for partial location matches
- Google Maps coordinate extraction guide
- Input validation and error handling
- Batch processing for large files