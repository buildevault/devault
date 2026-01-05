/**
 * Manage open/close of dropdowns
 * Called when user clicks on a corresponding element
 * This function controls the visibility of the "new task" form section
 */
function toggleDropdown() {
    const content = document.getElementById('dropdownContent');
    
    // If "collapsed" class is present, it will be removed (opening the dropdown)
    // If "collapsed" class is absent, it will be added (closing the dropdown)
    content.classList.toggle('collapsed');
    
    // Check current state and save to localStorage to remember user preference
    const isCollapsed = content.classList.contains('collapsed');
    localStorage.setItem('dropdownCollapsed', isCollapsed);
}

/**
 * This function controls the visibility of the options section
 * The principle is the same as above
 */
function toggleOptions() {
    const content = document.getElementById('optionsContent');
    
    content.classList.toggle('collapsed');
    
    const isCollapsed = content.classList.contains('collapsed');
    localStorage.setItem('optionsCollapsed', isCollapsed);
}





// ========================================
// OPEN IN APP BY URI SCHEME
// ========================================





/**
 * Function to select an app from the app selector
 * Called when user clicks on an app card
 */
function selectApp(element) {
    document.querySelectorAll('.app-card').forEach(card => {
        card.classList.remove('selected');
    });
    // Add the selected class to the clicked app, "element" is the app card that was clicked
    element.classList.add('selected');
    // Get the URI scheme from the clicked element's data-uri attribute
    const uri = element.getAttribute('data-uri');
    // Store the URI in the hidden input field so it gets submitted with the form
    document.getElementById('selectedAppUri').value = uri;
}

/**
 * Open app from task card
 * Called when user clicks the app icon inside a task
 */
function openApp(uri) {
    if (uri) {
        window.location.href = uri;
    }
}





// ========================================
// TODO SCANNER
// ========================================





// Aray to store all found TODO/FIXME/BUG comments
let foundTodos = [];

/**
 * Open directory picker
 * Uses the File System Access API to let user select a project folder
 */
async function openDirectoryPicker() {
    // Check browser compatibility
    if (!window.showDirectoryPicker) {
        alert('This feature works on (Chrome, Edge, or Opera).');
        return;
    }

    // Get UI elements
    const resultsEl = document.getElementById('todoResults');
    
    // Open native folder picker
    const directoryHandle = await window.showDirectoryPicker({ mode: 'read' });
        
    // Reset previous results and scan the selected directory
    foundTodos = [];
    await scanDirectory(directoryHandle, '');
        
    // Display results in the UI
    displayTodoResults();
        resultsEl.style.display = foundTodos.length > 0 ? 'block' : 'none';

}

/**
 * Scan directory for files with valid extensions
 * @param directoryHandle file system API handle for the directory
 * @param currentPath path string for display
 */
async function scanDirectory(directoryHandle, currentPath) {
    // File extensions to scan
    const validExtensions = [
        '.js', '.jsx',          // JavaScript
        '.py',                  // Python
        '.java',                // Java
        '.cpp', '.c', '.h',     // C and C++
        '.php',                 // PHP
        '.html',                // HTML
        '.txt'                  // Basic text files
    ];

    // Iterate through all entries in the directory
    for await (const entry of directoryHandle.values()) {
        // Build the full path for display
        const entryPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
        
        // If a file has been selected
        if (entry.kind === 'file') {
            // Check if file has a valid extension and scan it
            const hasValidExt = validExtensions.some(ext => entry.name.endsWith(ext));
            if (hasValidExt) {
                await scanFile(entry, entryPath);
            }
        // If a directory has been selected
        } else if (entry.kind === 'directory') {
            // Recursively scan all subdirectories
            await scanDirectory(entry, entryPath);
            }
    }
}

/**
 * Scan individual file for TODO/FIXME/BUG comments
 * @param fileHandle file system API handle for the file
 * @param filePath file path for display
 */
async function scanFile(fileHandle, filePath) {
    // Read file content as text
    const file = await fileHandle.getFile();
    const content = await file.text();
    const lines = content.split('\n');
    
    // Patterns to detect TODO, FIXME adn BUG comments
    const todoPatterns = [
        /\/\/\s*TODO[:\s](.+)/gi,           // JavaScript, Java, C, C++, PHP
        /\/\*\s*TODO[:\s](.+?)\*\//gi,      // JavaScript, Java, C, C++, PHP (block comments)
        /#\s*TODO[:\s](.+)/gi,              // Python
        /<!--\s*TODO[:\s](.+?)-->/gi,       // HTML

        /\/\/\s*FIXME[:\s](.+)/gi,        
        /\/\*\s*FIXME[:\s](.+?)\*\//gi,     
        /#\s*FIXME[:\s](.+)/gi,          
        /<!--\s*FIXME[:\s](.+?)-->/gi,    

        /\/\/\s*BUG[:\s](.+)/gi,            
        /\/\*\s*BUG[:\s](.+?)\*\//gi,       
        /#\s*BUG[:\s](.+)/gi,             
        /<!--\s*BUG[:\s](.+?)-->/gi      
    ];
    
// Search each line for TODO patterns
    lines.forEach((line, index) => {
        // Test each pattern with the current line
        todoPatterns.forEach(pattern => {
            // matchAll is a counter for  an iterator of all matches found in the line
            const matches = line.matchAll(pattern);
            
            // Loop through each match found
            for (const match of matches) {
                // match[0] contains the full match including the keyword
                const comment = match[0].trim();
                
                // Add the found item to the global array
                foundTodos.push({
                    file: filePath,
                    line: index + 1,
                    comment: comment,
                });
            }
        });
    });
}

/**
 * Display found TODOs in the UI
 * Creates a list of TODO items with import buttons
 */
function displayTodoResults() {
    const todoList = document.getElementById('todoList');
    const todoCount = document.getElementById('todoCount');
    
    // Update the counter
    todoCount.textContent = foundTodos.length;
    todoList.innerHTML = '';
    
    // Show a message if no result were found
    if (foundTodos.length === 0) {
        todoList.innerHTML = '<p class="no-todos">Nothing found in this project.</p>';
        return;
    }
    
    // Create HTML for each found TODO
    foundTodos.forEach((todo, index) => {
        const todoItem = document.createElement('div');
        todoItem.className = 'todo-item';
        todoItem.innerHTML = `
            <div class="todo-comment">${todo.comment}</div>
            <button type="button" class="btn-import-todo" onclick="importTodo(${index})" title="Import">
                    Import as a task
            </button>
        `;
        todoList.appendChild(todoItem);
    });
}

/**
 * Import a found TODO into the task creation form
 * Fill the form fields with the gathered data
 * @param index index of the TODO in the foundTodos array
 */
function importTodo(index) {
    const todo = foundTodos[index];
    // If at least one todo was found
    if (!todo) return;
    
    // Get form input elements
    const titleInput = document.querySelector('input[name="title"]');
    const descriptionInput = document.querySelector('textarea[name="description"]');
    
    // Automatically fill the form with TODO data
    // The title is the comment
    if (titleInput) {
        titleInput.value = todo.comment;
    }
    
    // The descritpion containes the location of the comment (file+line)
    if (descriptionInput) {
        descriptionInput.value = `In file ${todo.file} at line ${todo.line}`;
    }
    
    // Scroll to the form so user can review and submit
    document.getElementById('dropdownContent').scrollIntoView({ behavior: 'smooth' });
}





// ========================================
// COPY FUNCTIONS
// ========================================





/**
 * Copy code snippet to clipboard
 */

// async allows the use of await for clipboard operations
// button is the button element that was clicked, passed via onclick of the HTML
// taskId is the unique ID of the task, to find the corresponding snippet
async function copySnippet(button, taskId) {
    const snippetElement = document.getElementById(`snippet-${taskId}`);

    // Write the code snippet to the clipboard
    await navigator.clipboard.writeText(snippetElement.textContent);
    
    // Once the button has been pressed, its text transform to "copied"
    const originalText = button.textContent;
    button.textContent = 'Copied';
    
    // After two seconds, the button text returns to its original "copy" state
    setTimeout(() => {
        button.textContent = originalText;
    }, 2000);
}

/**
 * Copy git branch to clipboard
 */
async function copyBranch(button, branchName) {
    await navigator.clipboard.writeText(branchName);
    
    const originalText = button.textContent;
    button.textContent = 'Copied';
    
    setTimeout(() => {
        button.textContent = originalText;
    }, 2000);
}





// ========================================
// VERSION MANAGEMENT FUNCTIONS
// ========================================




// Used to give each entry an ID
let versionCounter = 0;

/**
 * Auto-detection of informations
 * Called when the user clicks on "auto-detect"
 * Finding browser and OS in the userAgent
 */
function autoDetectVersions() {
    // Get the userAgent from the browser
    const userAgent = navigator.userAgent;
    // Array to store all detected tools and their versions
    const detectedVersions = [];
        
    // Check for Windows
    if (userAgent.includes('Windows NT')) {
        // Format to only extract the version number
        const match = userAgent.match(/Windows NT ([\d.]+)/);
        if (match) {
            // match[1] contains the captured version number
            detectedVersions.push({ tool: 'windows', version: match[1] });
        }
    } 
    // Check for macOS
    else if (userAgent.includes('Mac OS X')) {
        const match = userAgent.match(/Mac OS X ([\d_]+)/);
        if (match) {
            detectedVersions.push({ tool: 'macos', version: match[1] });
        }
    } 

    // Check for Chorme
    if (userAgent.includes('Chrome')) {
        const match = userAgent.match(/Chrome\/([\d.]+)/);
        if (match) {
            detectedVersions.push({ tool: 'chrome', version: match[1] });
        }
    // Check for Safari
    } else if (userAgent.includes('Safari')) {
        const match = userAgent.match(/Version\/([\d.]+)/);
        if (match) {
            detectedVersions.push({ tool: 'safari', version: match[1] });
        }
    }

    // Detect and format screen resolution as width x height
    detectedVersions.push({ tool: 'screen', version: `${window.screen.width}x${window.screen.height}` });
    
    // Clear all existing entries from the container
    document.getElementById('versionEntries').innerHTML = '';
    versionCounter = 0;
    
    // Loop through each detected tool/version and create a UI entry
    detectedVersions.forEach(v => {
        addVersionEntryWithData(v.tool, v.version);
    });
    
    // Save all detected data to the hidden input field
    updateVersionData();
}

/**
 * Add pre-filled data
 * This function is called by autoDetectVersions() to create entries
 * @param tool represent the tool name
 * @param version represent version number
 */
function addVersionEntryWithData(tool, version) {
    // Increment counter to give each entry a unique ID
    // Used to identify which entry to remove when deleting
    versionCounter++;
    
    // Get the container where all version entries are displayed
    const container = document.getElementById('versionEntries');
    
    // Create a new div element for this version entry
    const entryDiv = document.createElement('div');
    entryDiv.className = 'version-entry';
    entryDiv.id = `version-${versionCounter}`;
    
    // Build the HTML content for the entry
    // Contains a dropdown, an input field, and a remove button
    entryDiv.innerHTML = `
        <select class="version-tool-select" onchange="updateVersionData()">
            <option value="">Select a tool</option>
            <!-- 
                For each option we check if the option matches the tool.
                If so, it has been detected and the selected attribute is automatically attached to it.
            -->
            <option value="python" ${tool === 'python' ? 'selected' : ''}>⌨️ Python</option>
            <option value="chrome" ${tool === 'chrome' ? 'selected' : ''}>🌐 Chrome</option>
            <option value="safari" ${tool === 'safari' ? 'selected' : ''}>🌐 Safari</option>
            <option value="macos" ${tool === 'macos' ? 'selected' : ''}>📀 MacOS</option>
            <option value="windows" ${tool === 'windows' ? 'selected' : ''}>📀 Windows</option>
            <option value="screen" ${tool === 'screen' ? 'selected' : ''}>🖥️ Screen</option>
        </select>
        
        <!-- Input field pre-filled with the detected version -->
        <input 
            type="text" 
            class="version-input" 
            placeholder="Version"
            value="${version}"
            oninput="updateVersionData()"
        >
        
        <!-- The versionCounter is passed to identify which entry to remove -->
        <!-- Button to remove the entry if not desired -->
        <button type="button" class="btn-remove-version" onclick="removeVersionEntry(${versionCounter})">
            🗑️
        </button>
    `;
    
    // Add the new entry to the container
    container.appendChild(entryDiv);
}

/**
 * Add a new empty version entry
 */
function addVersionEntry() {
    versionCounter++;
    const container = document.getElementById('versionEntries');
    
    const entryDiv = document.createElement('div');
    entryDiv.className = 'version-entry';
    entryDiv.id = `version-${versionCounter}`;
    
    entryDiv.innerHTML = `
        <select class="version-tool-select" onchange="updateVersionData()">
            <option value="">Tool</option>
            <option value="python">⌨️ Python</option>
            <option value="chrome">🌐 Chrome</option>
            <option value="safari">🌐 Safari</option>
            <option value="macos">📀 MacOS</option>
            <option value="windows">📀 Windows</option>
            <option value="screen">🖥️ Screen</option>
        </select>
        
        <!-- Text input for the version number -->
        <input 
            type="text" 
            class="version-input" 
            placeholder="version"
            oninput="updateVersionData()"
        >
        
        <button type="button" class="btn-remove-version" onclick="removeVersionEntry(${versionCounter})">
            🗑️
        </button>
    `;
    
    container.appendChild(entryDiv);
}

/**
 * Remove a version entry
 * @param id is the unique ID number of the entry to remove
 */
function removeVersionEntry(id) {
    const entry = document.getElementById(`version-${id}`);
    // Check if the entry is existing
    if (entry) {
        // Remove the entry
        entry.remove();
        updateVersionData();
    }
}

/**
 * Collect all version informations entries.
 * Store them as a JSON string inside a hidden input field.
 */
function updateVersionData() {
    // Gather all blocks that represent a version entry
    const entries = document.querySelectorAll('.version-entry');
    // This array will hold all objects
    const versions = [];
    
    // Loop through each version entry found on the page
    entries.forEach(entry => {
        // Retrieve the selected tool from the dropdown
        const tool = entry.querySelector('.version-tool-select').value;
        // Retrieve the version
        const version = entry.querySelector('.version-input').value.trim();
        
        // Only store entries where both exist
        if (tool && version) {
            versions.push({ tool, version });
        }
    });
    
    // Locate the hidden input that stores the JSON version data
    const input = document.getElementById('versionInfoInput');
    // Convert the collected array to JSON
    input.value = JSON.stringify(versions);
}

/**
 * Render version badges inside task card
 */
function renderVersionBadges(taskId, versionInfoJson) {
    // Convert the JSON string into an array of { tool, version } objects
    const versions = JSON.parse(versionInfoJson);
    // Locate the DOM container where badges for this task should be inserted
    const container = document.getElementById(`taskVersions-${taskId}`);
    // Giving each key a more visual name
    const names = {
        python: '⌨️ Python',
        chrome: '🌐 Chrome',
        safari: '🌐 Safari',
        macos: '📀 MacOS',
        windows: '📀 Windows',
        screen: '🖥️ Screen'
    };

    // Build the HTML for all version badges and inject it into the container
    // Each entry becomes a <span> styled as a visual badge
    container.innerHTML = versions.map(v => `
        <span class="version-badge" title="${names[v.tool]} ${v.version}">
            <span class="version-text">${names[v.tool]} ${v.version}</span>
        </span>
    `).join('');
}

/**
 * Render all version informations on page load
 */
function renderAllVersionBadges() {
     // Select all elements that store version info as a data attribute
    const containers = document.querySelectorAll('.version-badges[data-versions]');
    
    // Process each of these containers
    containers.forEach(container => {
        // Read the JSON stored in the attribute
        const versionJson = container.getAttribute('data-versions');
        // Extract the task ID
        const taskId = container.id.replace('taskVersions-', '');
        
        // If both values exist, render the badges for this task
        if (versionJson && taskId) {
            renderVersionBadges(taskId, versionJson);
        }
    });
}

// ========================================
// PAGE INITIALIZATION
// ========================================

document.addEventListener('DOMContentLoaded', function() {

    // Restore collapsed state of the main dropdown
    if (localStorage.getItem('dropdownCollapsed') === 'true') {
        document.getElementById('dropdownContent').classList.add('collapsed');
    }

    // Restore collapsed state of the options panel
    const opts = localStorage.getItem('optionsCollapsed');
    if (opts === null || opts === 'true') {
        document.getElementById('optionsContent').classList.add('collapsed');
    }

    // Set default date to today
    document.getElementById('dueDate').value =
        new Date().toISOString().split('T')[0];

    // Render version badges
    renderAllVersionBadges();
});
