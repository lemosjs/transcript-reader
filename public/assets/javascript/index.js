
// Check browser compatibility
(function checkBrowserCompatibility() {
            // Check for essential features
            const missingFeatures = [];
            
            if (!window.FileReader) missingFeatures.push('FileReader');
            if (!window.JSON) missingFeatures.push('JSON');
            if (!window.fetch) missingFeatures.push('fetch');
            
            // Show notice if features are missing
            if (missingFeatures.length > 0) {
                const notice = document.getElementById('browser-notice');
                if (notice) {
                    notice.style.display = 'block';
                    notice.innerHTML += '<br>Missing features: ' + missingFeatures.join(', ');
                }
                console.warn('Browser compatibility issues:', missingFeatures);
            }
        })();
        
        // Global error handler
        window.onerror = function(message, source, lineno, colno, error) {
            console.error('Global error:', message, error);
            showError('An unexpected error occurred: ' + message);
            return false;
        };
        
        // Function to show errors to the user
        function showError(message) {
            const container = document.getElementById('error-container');
            const messageEl = document.getElementById('error-message');
            
            if (container && messageEl) {
                messageEl.textContent = message;
                container.style.display = 'block';
            }
        }
        
        // Hide error when user interacts with the page
        document.addEventListener('click', function() {
            const container = document.getElementById('error-container');
            if (container) {
                container.style.display = 'none';
            }
        });
        
        // State variables
        let documents = [];
        let currentIndex = 0;
        const decisions = {
            approved: [],
            rejected: []
        };

        // DOM elements - safely get them with error handling
        let getElement = (id) => {
            const el = document.getElementById(id);
            if (!el) console.warn(`Element with ID '${id}' not found`);
            return el;
        };
        
        let docDisplay = getElement('document-display');
        let docId = getElement('doc-id');
        let website = getElement('website');
        let phone = getElement('phone');
        let timeEst = getElement('time-est');
        let transcriptionEl = getElement('transcription');
        let approveBtn = getElement('approve-btn');
        let rejectBtn = getElement('reject-btn');
        let prevBtn = getElement('prev-btn');
        let nextBtn = getElement('next-btn');
        let currentIndexEl = getElement('current-index');
        let totalDocsEl = getElement('total-docs');
        let totalCountEl = getElement('total-count');
        let approvedCountEl = getElement('approved-count');
        let rejectedCountEl = getElement('rejected-count');
        let pendingCountEl = getElement('pending-count');
        let fileInput = getElement('transcript-file');
        let uploadBtn = getElement('upload-btn');
        let saveDecisionsBtn = getElement('save-decisions-btn');
        let loadingEl = getElement('loading');

        // Key phrases to highlight
        const keyPhrases = [
            "monthly payment",
            "monthly premium",
            "a month",
            "per month",
            "household income",
            "annual income",
            "deductible",
            "co[ -]?pay",
            "insurance",
            "coverage",
            "health( insurance)?",
            "plan",
            "policy",
            "premium",
            "income",
            "yearly",
            "monthly",
            "making",
            "rate",
            "dollars"
        ];

        // Function to highlight monetary values and key phrases in text
        function highlightText(text) {
            if (!text) return '';
            
            console.log("Highlighting text, length:", text.length);
            
            try {
                // First escape HTML to prevent XSS
                const escaped = text.toString().replace(/&/g, '&amp;')
                                   .replace(/</g, '&lt;')
                                   .replace(/>/g, '&gt;')
                                   .replace(/"/g, '&quot;')
                                   .replace(/'/g, '&#039;');
                
                // Highlight monetary values (e.g., $100, $1,200.50, 100 dollars)
                let highlighted = escaped.replace(/\$\d{1,3}(,\d{3})*(\.\d+)?/g, 
                    '<span class="highlight-money">$&</span>');
                    
                // Also match patterns like "X dollars" or "X hundred/thousand dollars"
                highlighted = highlighted.replace(/(\d+)( hundred| thousand| million| billion)? dollars/gi, 
                    '<span class="highlight-money">$&</span>');
                    
                // Match dollar amounts with decimals like "100.50 dollars"
                highlighted = highlighted.replace(/(\d+\.\d+)( hundred| thousand| million| billion)? dollars/gi, 
                    '<span class="highlight-money">$&</span>');
                
                // Highlight key phrases
                keyPhrases.forEach(phrase => {
                    const regex = new RegExp('\\b(' + phrase + ')\\b', 'gi');
                    highlighted = highlighted.replace(regex, '<span class="highlight-keyphrase">$&</span>');
                });
                
                console.log("Highlighting completed successfully");
                return highlighted;
            } catch (error) {
                console.error("Error in highlightText function:", error);
                return `<p>Error highlighting text: ${error.message}</p><pre>${text}</pre>`;
            }
        }

        // Fetch documents with proper async/await handling
        async function fetchDocuments() {
            try {
                const response = await fetch('unique_new_documents.json');
                if (!response.ok) {
                    throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
                }
                
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    throw new Error('Invalid content type, expected JSON');
                }
                
                const data = await response.json();
                if (!Array.isArray(data)) {
                    throw new Error('Fetched data is not an array');
                }
                
                // Validate the documents
                documents = validateDocuments(data);
                
                // Update UI
                if (totalDocsEl) totalDocsEl.textContent = documents.length;
                if (totalCountEl) totalCountEl.textContent = documents.length;
                if (pendingCountEl) pendingCountEl.textContent = documents.length;
                
                if (documents.length > 0) {
                    displayDocument(0);
                } else {
                    if (docDisplay) docDisplay.innerHTML = '<p>No documents found</p>';
                }
                
                return documents;
            } catch (error) {
                console.error('Error loading demo documents:', error);
                if (docDisplay) {
                    docDisplay.innerHTML = `<p>No demo documents available. Please upload a transcription file.</p>`;
                }
                
                // Reset counters since we don't have documents
                if (totalDocsEl) totalDocsEl.textContent = "0";
                if (totalCountEl) totalCountEl.textContent = "0";
                if (pendingCountEl) pendingCountEl.textContent = "0";
                
                throw error;
            }
        }

        // Process uploaded file
        function processUploadedFile(file) {
            const reader = new FileReader();
            if (loadingEl) loadingEl.style.display = 'block';
            
            reader.onload = function(e) {
                try {
                    // Check if file is empty
                    if (!e.target.result || e.target.result.trim() === '') {
                        if (loadingEl) loadingEl.style.display = 'none';
                        throw new Error('File is empty');
                    }
                    
                    // Log the first part of the file content for debugging
                    console.log("File content starts with:", e.target.result.substring(0, 200));
                    
                    // Validate JSON before parsing
                    let uploadedData;
                    try {
                        uploadedData = JSON.parse(e.target.result);
                    } catch (parseError) {
                        console.error('JSON Parse Error:', parseError);
                        console.error('Content starts with:', e.target.result.substring(0, 100));
                        throw new Error('Invalid JSON format. Make sure the file contains valid JSON.');
                    }
                    
                    // Check if we have an array of documents
                    if (!Array.isArray(uploadedData)) {
                        if (loadingEl) loadingEl.style.display = 'none';
                        throw new Error('The file must contain an array of documents');
                    }
                    
                    // Check if array is empty
                    if (uploadedData.length === 0) {
                        if (loadingEl) loadingEl.style.display = 'none';
                        throw new Error('The file contains an empty array, no documents found');
                    }
                    
                    // Validate document structure
                    const validatedDocuments = validateDocuments(uploadedData);
                    
                    console.log(`Processed ${validatedDocuments.length} valid documents out of ${uploadedData.length}`);
                    
                    // Process client-side - load immediately
                    documents = validatedDocuments;
                    resetUI();
                    if (loadingEl) loadingEl.style.display = 'none';
                } catch (error) {
                    console.error('Error processing file:', error);
                    alert(`Error: ${error.message}`);
                    if (loadingEl) loadingEl.style.display = 'none';
                }
            };
            
            reader.onerror = function() {
                console.error('File read error');
                alert('Error reading the file');
                if (loadingEl) loadingEl.style.display = 'none';
            };
            
            reader.readAsText(file);
        }

        // Process uploaded file and compare with another file
        function compareUploadedFiles() {
            const newFile = document.getElementById('new-file').files[0];
            const oldFile = document.getElementById('old-file').files[0];
            
            if (!newFile) {
                return alert('Please select a new transcription file');
            }
            
            if (loadingEl) loadingEl.style.display = 'block';
            
            const newFileReader = new FileReader();
            
            newFileReader.onload = function(e) {
                try {
                    // Check if file is empty
                    if (!e.target.result || e.target.result.trim() === '') {
                        if (loadingEl) loadingEl.style.display = 'none';
                        throw new Error('New file is empty');
                    }
                    
                    // Validate JSON before parsing
                    let newTranscriptions;
                    try {
                        newTranscriptions = JSON.parse(e.target.result);
                    } catch (parseError) {
                        console.error('JSON Parse Error (new file):', parseError);
                        console.error('Content starts with:', e.target.result.substring(0, 100));
                        throw new Error('Invalid JSON format in new file. Make sure the file contains valid JSON.');
                    }
                    
                    if (!Array.isArray(newTranscriptions)) {
                        if (loadingEl) loadingEl.style.display = 'none';
                        throw new Error('The new transcription file must contain an array of documents');
                    }
                    
                    // Validate document structure
                    const validatedNewTranscriptions = validateDocuments(newTranscriptions);
                    
                    // If no old file is selected, just load the new file
                    if (!oldFile) {
                        documents = validatedNewTranscriptions;
                        resetUI();
                        if (loadingEl) loadingEl.style.display = 'none';
                        return;
                    }
                    
                    // Otherwise read the old file and compare
                    const oldFileReader = new FileReader();
                    oldFileReader.onload = function(e2) {
                        try {
                            // Check if file is empty
                            if (!e2.target.result || e2.target.result.trim() === '') {
                                if (loadingEl) loadingEl.style.display = 'none';
                                throw new Error('Old file is empty');
                            }
                            
                            // Validate JSON before parsing
                            let oldTranscriptions;
                            try {
                                oldTranscriptions = JSON.parse(e2.target.result);
                            } catch (parseError) {
                                console.error('JSON Parse Error (old file):', parseError);
                                console.error('Content starts with:', e2.target.result.substring(0, 100));
                                throw new Error('Invalid JSON format in old file. Make sure the file contains valid JSON.');
                            }
                            
                            if (!Array.isArray(oldTranscriptions)) {
                                if (loadingEl) loadingEl.style.display = 'none';
                                throw new Error('The old transcription file must contain an array of documents');
                            }
                            
                            // Validate document structure
                            const validatedOldTranscriptions = validateDocuments(oldTranscriptions);
                            
                            // Find unique documents in new transcriptions
                            const uniqueTranscriptions = findUniqueTranscriptions(
                                validatedNewTranscriptions, 
                                validatedOldTranscriptions
                            );
                            
                            documents = uniqueTranscriptions;
                            resetUI();
                            alert(`Found ${uniqueTranscriptions.length} unique transcriptions`);
                            if (loadingEl) loadingEl.style.display = 'none';
                        } catch (error) {
                            console.error('Error processing old file:', error);
                            alert(`Error: ${error.message}`);
                            if (loadingEl) loadingEl.style.display = 'none';
                        }
                    };
                    
                    oldFileReader.onerror = function() {
                        console.error('Old file read error');
                        alert('Error reading the old file');
                        if (loadingEl) loadingEl.style.display = 'none';
                    };
                    
                    oldFileReader.readAsText(oldFile);
                } catch (error) {
                    console.error('Error processing new file:', error);
                    alert(`Error: ${error.message}`);
                    if (loadingEl) loadingEl.style.display = 'none';
                }
            };
            
            newFileReader.onerror = function() {
                console.error('New file read error');
                alert('Error reading the new file');
                if (loadingEl) loadingEl.style.display = 'none';
            };
            
            newFileReader.readAsText(newFile);
        }
        
        // Validate documents and ensure they have required fields
        function validateDocuments(docs) {
            return docs.filter(doc => {
                // Ensure it has the minimum required structure
                if (!doc || typeof doc !== 'object') return false;
                
                // Check if it has an _id with $oid
                if (!doc._id || !doc._id.$oid) {
                    console.warn('Document missing _id.$oid, adding placeholder ID', doc);
                    // Add a placeholder ID if missing
                    doc._id = { $oid: 'generated-' + Math.random().toString(36).substring(2, 15) };
                }
                
                // Ensure transcription is a string
                if (doc.transcription === undefined || doc.transcription === null) {
                    console.warn('Document missing transcription field, adding placeholder', doc);
                    doc.transcription = 'No transcription available';
                } else if (typeof doc.transcription !== 'string') {
                    console.warn('Document transcription is not a string, converting', doc);
                    try {
                        doc.transcription = String(doc.transcription);
                    } catch (e) {
                        doc.transcription = 'Invalid transcription format';
                    }
                }
                
                return true;
            });
        }

        // Find unique transcriptions by comparing new and old
        function findUniqueTranscriptions(newTranscriptions, oldTranscriptions) {
            // Create map for faster lookup
            const oldTranscriptionsMap = new Map();
            oldTranscriptions.forEach(doc => {
                if (doc._id && doc._id.$oid) {
                    oldTranscriptionsMap.set(doc._id.$oid, doc);
                }
            });
            
            // Find unique documents in new transcriptions
            return newTranscriptions.filter(doc => {
                if (!doc._id || !doc._id.$oid) return false;
                return !oldTranscriptionsMap.has(doc._id.$oid);
            });
        }

        // Reset UI with new document data
        function resetUI() {
            // Reset decisions
            decisions.approved = [];
            decisions.rejected = [];
            
            // Update global counts
            const totalCount = documents ? documents.length : 0;
            if (totalDocsEl) totalDocsEl.textContent = totalCount;
            if (totalCountEl) totalCountEl.textContent = totalCount;
            if (pendingCountEl) pendingCountEl.textContent = totalCount;
            if (approvedCountEl) approvedCountEl.textContent = 0;
            if (rejectedCountEl) rejectedCountEl.textContent = 0;
            
            // Make sure the document display structure is sound
            ensureDocumentDisplayStructure();
            
            if (documents && documents.length > 0) {
                try {
                    displayDocument(0);
                } catch (error) {
                    console.error('Error displaying first document:', error);
                    if (docDisplay) {
                        docDisplay.innerHTML = `
                            <div class="error-message">
                                <h3>Error displaying document</h3>
                                <p>${error.message}</p>
                            </div>
                        `;
                    }
                }
            } else {
                // If no documents, clear the display area
                if (docDisplay) {
                    docDisplay.innerHTML = '<p>No documents loaded. Please upload a file.</p>';
                    // Ensure stats show 0/0
                    const currentIndexEl = document.getElementById('current-index');
                    if (currentIndexEl) currentIndexEl.textContent = '0';
                }
            }
        }
        
        // Ensure the document display structure is present
        function ensureDocumentDisplayStructure() {
            if (!docDisplay) {
                console.error('Document display container not found');
                return;
            }
            
            // Check if essential spans and transcription div exist
            const requiredIds = ['current-index', 'total-docs', 'doc-id', 'website', 'phone', 'time-est', 'transcription', 'approve-btn', 'reject-btn'];
            let structureMissing = false;
            for (const id of requiredIds) {
                if (!document.getElementById(id)) {
                    structureMissing = true;
                    break;
                }
            }
            
            if (structureMissing) {
                console.log('Recreating missing document display structure');
                docDisplay.innerHTML = `
                    <h2>Document: <span id="current-index">0</span>/<span id="total-docs">0</span></h2>
                    <p><strong>ID:</strong> <span id="doc-id">N/A</span></p>
                    <p><strong>Website:</strong> <span id="website">N/A</span></p>
                    <p><strong>Phone:</strong> <span id="phone">N/A</span></p>
                    <p><strong>Time Estimate:</strong> <span id="time-est">N/A</span></p>
                    
                    <h3>Transcription:</h3>
                    <div id="transcription" class="transcription">No transcription loaded yet</div>
                    
                    <div class="buttons">
                        <button id="approve-btn" class="approve-btn">Approve</button>
                        <button id="reject-btn" class="reject-btn">Reject</button>
                    </div>
                `;
                
                // Update our DOM element references and re-attach listeners
                updateDomReferencesAndListeners();
            }
        }
        
        // Update DOM references and re-attach listeners
        function updateDomReferencesAndListeners() {
            initializeDomElements(); // Re-fetch all elements
            setupEventHandlers(); // Re-attach listeners
        }

        // Display a document
        function displayDocument(index) {
            if (!documents || documents.length === 0) {
                if (docDisplay) docDisplay.innerHTML = '<p>No documents available</p>';
                return;
            }
            
            if (index < 0 || index >= documents.length) {
                console.error(`Invalid index: ${index}. Documents length: ${documents.length}`);
                return;
            }
            
            try {
                const doc = documents[index];
                console.log("Document to display:", JSON.stringify(doc, null, 2));
                
                currentIndex = index;
                
                // Update UI elements safely by checking if they exist first
                if (currentIndexEl) currentIndexEl.textContent = index + 1;
                if (totalDocsEl) totalDocsEl.textContent = documents.length;
                
                if (!doc) {
                    if (docDisplay) docDisplay.innerHTML = `<p>Document at index ${index} is missing or invalid</p>`;
                    return;
                }
                
                // Ensure doc._id exists and has an $oid property
                const documentId = doc._id && doc._id.$oid ? doc._id.$oid : 'Unknown';
                
                // Update document info - first check if elements exist
                const docIdElement = document.getElementById('doc-id');
                if (docIdElement) docIdElement.textContent = documentId;
                
                if (website) website.textContent = doc.website_name || 'N/A';
                if (phone) phone.textContent = doc.phoneNumber || 'N/A';
                if (timeEst) timeEst.textContent = doc.timeEst || 'N/A';
                
                // Display transcription with highlighting - add extensive logging
                let transcriptionText = doc.transcription || 'No transcription available';
                console.log("Transcription text:", transcriptionText);
                
                if (transcriptionEl) {
                    console.log("Transcription element found, setting innerHTML");
                    try {
                        const highlightedText = highlightText(transcriptionText);
                        console.log("Highlighted text length:", highlightedText.length);
                        transcriptionEl.innerHTML = highlightedText;
                    } catch (highlightError) {
                        console.error("Error highlighting text:", highlightError);
                        transcriptionEl.innerHTML = `<p>Error highlighting transcription: ${highlightError.message}</p><pre>${transcriptionText}</pre>`;
                    }
                } else {
                    console.error("Transcription element not found!");
                }
                
                // Update button states based on previous decisions
                if (approveBtn && rejectBtn) {
                    if (decisions.approved.includes(documentId)) {
                        approveBtn.disabled = true;
                        rejectBtn.disabled = false;
                    } else if (decisions.rejected.includes(documentId)) {
                        approveBtn.disabled = false;
                        rejectBtn.disabled = true;
                    } else {
                        approveBtn.disabled = false;
                        rejectBtn.disabled = false;
                    }
                }
                
                // Update navigation buttons
                if (prevBtn) prevBtn.disabled = index === 0;
                if (nextBtn) nextBtn.disabled = index === documents.length - 1;
            } catch (error) {
                console.error('Error displaying document:', error);
                if (docDisplay) {
                    docDisplay.innerHTML = `<p>Error displaying document: ${error.message}</p>`;
                }
            }
        }

        // Save decisions to a file
        function saveDecisions() {
            try {
                if (!documents || documents.length === 0) {
                    alert('No documents to save');
                    return;
                }
                
                const getDocumentId = (doc) => doc && doc._id && doc._id.$oid ? doc._id.$oid : null;
                
                // Filter out approved documents safely
                const approvedDocs = documents.filter(doc => {
                    const id = getDocumentId(doc);
                    return id && decisions.approved.includes(id);
                });
                
                // Filter out rejected documents safely
                const rejectedDocs = documents.filter(doc => {
                    const id = getDocumentId(doc);
                    return id && decisions.rejected.includes(id);
                });
                
                // Filter out pending documents safely
                const pendingDocs = documents.filter(doc => {
                    const id = getDocumentId(doc);
                    return id && !decisions.approved.includes(id) && !decisions.rejected.includes(id);
                });
                
                const output = {
                    approved: approvedDocs,
                    rejected: rejectedDocs,
                    pending: pendingDocs
                };
                
                const blob = new Blob([JSON.stringify(output, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                
                const a = document.createElement('a');
                a.href = url;
                a.download = 'transcription_decisions.json';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } catch (error) {
                console.error('Error saving decisions:', error);
                alert(`Error saving decisions: ${error.message}`);
            }
        }

        // Event handlers - these are now defined in the DOMContentLoaded function
        // uploadBtn.addEventListener('click', () => {
        //     ...
        // });
        
        // saveDecisionsBtn.addEventListener('click', saveDecisions);

        // Approve current document
        function approveDocument() {
            if (!documents || documents.length === 0 || currentIndex < 0 || currentIndex >= documents.length) {
                return;
            }
            
            const doc = documents[currentIndex];
            if (!doc || !doc._id || !doc._id.$oid) {
                alert('Cannot approve: The document has an invalid ID');
                return;
            }
            
            const documentId = doc._id.$oid;
            
            // Remove from rejected if it was there
            const rejIndex = decisions.rejected.indexOf(documentId);
            if (rejIndex !== -1) {
                decisions.rejected.splice(rejIndex, 1);
            }
            
            // Add to approved if not already there
            if (!decisions.approved.includes(documentId)) {
                decisions.approved.push(documentId);
            }
            
            updateCounts();
            
            // Move to next document if available
            if (currentIndex < documents.length - 1) {
                displayDocument(currentIndex + 1);
            }
        }
        
        // Reject current document
        function rejectDocument() {
            if (!documents || documents.length === 0 || currentIndex < 0 || currentIndex >= documents.length) {
                return;
            }
            
            const doc = documents[currentIndex];
            if (!doc || !doc._id || !doc._id.$oid) {
                alert('Cannot reject: The document has an invalid ID');
                return;
            }
            
            const documentId = doc._id.$oid;
            
            // Remove from approved if it was there
            const appIndex = decisions.approved.indexOf(documentId);
            if (appIndex !== -1) {
                decisions.approved.splice(appIndex, 1);
            }
            
            // Add to rejected if not already there
            if (!decisions.rejected.includes(documentId)) {
                decisions.rejected.push(documentId);
            }
            
            updateCounts();
            
            // Move to next document if available
            if (currentIndex < documents.length - 1) {
                displayDocument(currentIndex + 1);
            }
        }

        // Update count statistics
        function updateCounts() {
            try {
                // Ensure we have valid document counts before updating
                if (!documents) {
                    approvedCountEl.textContent = '0';
                    rejectedCountEl.textContent = '0';
                    pendingCountEl.textContent = '0';
                    return;
                }
                
                approvedCountEl.textContent = decisions.approved.length;
                rejectedCountEl.textContent = decisions.rejected.length;
                pendingCountEl.textContent = documents.length - decisions.approved.length - decisions.rejected.length;
            } catch (error) {
                console.error('Error updating counts:', error);
            }
        }

        // Initialize
        document.addEventListener('DOMContentLoaded', () => {
            try {
                console.log("Initializing application...");
                
                // Check if critical containers exist
                const appContainer = document.querySelector('body');
                if (!appContainer) {
                    console.error('Fatal error: No body element found');
                    return;
                }
                
                // First attempt to get all critical DOM elements
                const allElements = initializeDomElements();
                if (!allElements.success) {
                    console.error('Critical elements missing:', allElements.missing);
                    // We'll continue and try to create/fix them later
                }
                
                // Make sure document display container exists
                if (!docDisplay) {
                    console.error('Critical element missing: document-display');
                    const newDocDisplay = document.createElement('div');
                    newDocDisplay.id = 'document-display';
                    newDocDisplay.className = 'document-container';
                    newDocDisplay.innerHTML = '<p>Document display container created dynamically</p>';
                    appContainer.appendChild(newDocDisplay);
                    
                    // Update reference
                    docDisplay = document.getElementById('document-display');
                }
                
                // Ensure transcription element exists
                ensureDocumentDisplayStructure();
                
                // Setup event handlers
                setupEventHandlers();
                
                // Try to fetch initial documents
                fetchDocuments().catch(error => {
                    console.warn('Could not fetch initial documents:', error);
                    // This is not fatal, user can upload their own documents
                });
                
                console.log("Application initialized successfully");
            } catch (error) {
                console.error('Error initializing application:', error);
                const errorContainer = document.createElement('div');
                errorContainer.className = 'error-message';
                errorContainer.innerHTML = `
                    <h2>Application Error</h2>
                    <p>The application failed to initialize: ${error.message}</p>
                    <p>Please reload the page or contact support.</p>
                `;
                document.body.appendChild(errorContainer);
            }
        });
        
        // Initialize DOM elements safely
        function initializeDomElements() {
            const requiredElements = [
                'document-display',
                'upload-mode',
                'upload-btn',
                'transcript-file'
            ];
            
            const missingElements = [];
            
            // Update element getter without redefining it
            getElement = (id) => {
                const el = document.getElementById(id);
                if (!el && requiredElements.includes(id)) {
                    missingElements.push(id);
                }
                return el;
            };
            
            // Get all elements
            docDisplay = getElement('document-display');
            docId = getElement('doc-id');
            website = getElement('website');
            phone = getElement('phone');
            timeEst = getElement('time-est');
            transcriptionEl = getElement('transcription');
            approveBtn = getElement('approve-btn');
            rejectBtn = getElement('reject-btn');
            prevBtn = getElement('prev-btn');
            nextBtn = getElement('next-btn');
            currentIndexEl = getElement('current-index');
            totalDocsEl = getElement('total-docs');
            totalCountEl = getElement('total-count');
            approvedCountEl = getElement('approved-count');
            rejectedCountEl = getElement('rejected-count');
            pendingCountEl = getElement('pending-count');
            fileInput = getElement('transcript-file');
            uploadBtn = getElement('upload-btn');
            saveDecisionsBtn = getElement('save-decisions-btn');
            loadingEl = getElement('loading');
            
            return {
                success: missingElements.length === 0,
                missing: missingElements
            };
        }
        
        // Setup all event handlers
        function setupEventHandlers() {
            // Handle upload mode changes
            const uploadModeSelector = document.getElementById('upload-mode');
            if (uploadModeSelector) {
                uploadModeSelector.addEventListener('change', function() {
                    const singleUpload = document.getElementById('single-upload');
                    const compareUpload = document.getElementById('compare-upload');
                    
                    if (this.value === 'single') {
                        if (singleUpload) singleUpload.style.display = 'block';
                        if (compareUpload) compareUpload.style.display = 'none';
                    } else {
                        if (singleUpload) singleUpload.style.display = 'none';
                        if (compareUpload) compareUpload.style.display = 'block';
                    }
                });
            }
            
            // Add event listeners only if elements exist
            if (uploadBtn) {
                uploadBtn.addEventListener('click', handleUpload);
            }
            
            if (saveDecisionsBtn) {
                saveDecisionsBtn.addEventListener('click', saveDecisions);
            }
            
            if (approveBtn) {
                approveBtn.addEventListener('click', approveDocument);
            }
            
            if (rejectBtn) {
                rejectBtn.addEventListener('click', rejectDocument);
            }
            
            if (prevBtn) {
                prevBtn.addEventListener('click', () => {
                    if (currentIndex > 0) {
                        displayDocument(currentIndex - 1);
                    }
                });
            }
            
            if (nextBtn) {
                nextBtn.addEventListener('click', () => {
                    if (documents && currentIndex < documents.length - 1) {
                        displayDocument(currentIndex + 1);
                    }
                });
            }
        }
        
        // Handle the upload button click based on upload mode
        function handleUpload() {
            try {
                const uploadModeSelector = document.getElementById('upload-mode');
                if (!uploadModeSelector) {
                    alert('Upload mode selector not found');
                    return;
                }
                
                if (uploadModeSelector.value === 'single') {
                    // Single file mode
                    const fileInput = document.getElementById('transcript-file');
                    if (!fileInput || fileInput.files.length === 0) {
                        alert('Please select a file to upload');
                        return;
                    }
                    processUploadedFile(fileInput.files[0]);
                } else {
                    // Compare mode
                    compareUploadedFiles();
                }
            } catch (error) {
                console.error('Error handling upload:', error);
                alert(`Upload error: ${error.message}`);
            }
        }
