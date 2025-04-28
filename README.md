# Transcription Reader

A web application for reviewing, comparing, and managing transcription documents. This tool allows you to:

- Upload and process JSON files containing transcriptions
- Compare new transcriptions with existing ones to find unique entries
- Review transcriptions with highlighted key phrases and monetary values
- Approve or reject individual transcriptions
- Save your decisions to a JSON file

## Getting Started

### Prerequisites

- Node.js (v12 or higher)
- npm or yarn

### Installation

1. Clone this repository or download the files
2. Install the dependencies:

```bash
npm install
```

### Running the Application

Start the server:

```bash
npm start
```

This will:
1. Start an Express server on port 3000
2. Process the initial JSON files (158witholdtags.json and 167withnewtag.json) for demo purposes
3. Create a public/unique_new_documents.json file with the unique documents
4. Serve the application from the public folder

Open your browser and navigate to http://localhost:3000/ to use the application.

## Features

### Upload and Process Transcription Files

There are two upload modes:

1. **Single File Mode**: Upload a single JSON file containing transcriptions
   - Click "Browse" to select a JSON file
   - Click "Process Transcription" to load the file

2. **Compare Files Mode**: Compare two JSON files to find unique transcriptions
   - Upload a "New Transcriptions" file
   - Optionally upload an "Old Transcriptions" file to compare against
   - The app will find transcriptions in the new file that don't exist in the old file

### Review Transcriptions

- Navigate through documents using the "Previous" and "Next" buttons
- Monetary values are highlighted in yellow
- Key phrases related to health insurance are highlighted in pink
- Approve or reject each document using the corresponding buttons

### Save Decisions

- Click "Save Decisions" to download a JSON file containing your approved, rejected, and pending documents

## File Structure

- `index.js`: Simple Express server to serve the static files
- `public/`: Static files directory
  - `index.html`: Main application interface
  - `unique_new_documents.json`: Generated demo file with unique documents (if source files are available)

## Client-Side Processing

All transcription processing happens in the browser:
- File uploading and parsing
- Comparison between transcription sets
- Highlighting of key terms
- Approval/rejection tracking

This approach eliminates the need for server-side processing and allows the app to work without server connectivity once loaded.

## License

This project is licensed under the MIT License. 