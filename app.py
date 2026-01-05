# Necessary imports 
from flask import Flask, render_template, request, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

# Available applications with URI scheme for direct access
AVAILABLE_APPS = [
    {
        'name': 'VSCode',       # Name
        'uri': 'vscode://',     # URI scheme
        'icon': 'vscode.png'    # Image (located in static > icons)
    },
    {
        'name': 'Sketch',
        'uri': 'sketch://',
        'icon': 'sketch.png'
    },
    {
        'name': 'Xcode',
        'uri': 'xcode://',
        'icon': 'xcode.png'
    },
    {
        'name': 'GitHub',
        'uri': 'x-github-client://',
        'icon': 'github.png'
    },
    {
        'name': 'Figma',
        'uri': 'figma://',
        'icon': 'figma.png'
    }
]

# Return the dictionary of an application based on its URI
def get_app_by_uri(uri):
    for app in AVAILABLE_APPS:
        if app['uri'] == uri:
            return app
    return None

app = Flask(__name__)   # Initialize Flask application

# ========================================
# DATABASE CONFIGURATION
# ========================================

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///devault.db'  # Configure the database file location
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False            # Improve performance by disabling modification tracking
db = SQLAlchemy(app)                                            # Initialize the database manaer SQLAlchemy

# ========================================
# DATABASE MODEL
# ========================================

# Define the structure of tasks
class Task(db.Model):

    # Primary key: unique identifier for each task
    id = db.Column(db.Integer, primary_key=True)                # Primary key: unique identifier for each task
    title = db.Column(db.String(100), nullable=False)           # Title: task name (required, max 100 characters)
    description = db.Column(db.Text, nullable=True)             # Description: detailed task description (optional, unlimited text)
    due_date = db.Column(db.Date, nullable=False)               # Due date: deadline for the task (required for sorting them)
    status = db.Column(db.String(20), default='todo')           # Status: current state of the task (default: 'todo')
    app_uri = db.Column(db.String(200), nullable=True)          # App URI: application to open with this task (optional)
    code_snippet = db.Column(db.Text, nullable=True)            # Code snippet: associate code snippet (optional)
    git_branch = db.Column(db.String(200), nullable=True)       # Git branch: branch name associated with this task (optional)
    github_username = db.Column(db.String(100), nullable=True)  # GitHub username (optional, to create direct link)
    github_repo = db.Column(db.String(100), nullable=True)      # GitHub repository name (optional, to create direct link)
    version_info = db.Column(db.Text, nullable=True)            # Version info: JSON string with tool versions (optional) 

    # Helper function in case of debugging
    def __repr__(self):
        return f'<Task {self.id}: {self.title}>'    # Return the task ID and its title

# ========================================
# ROUTES
# ========================================

@app.route('/')         # Define the route for the home page ('/')
def index():            # Function executed when the user visits the page
    # Query the database for all task objects
    # Sort them by due_date in ascending order
    # Return the results as a list
    tasks = Task.query.order_by(Task.due_date.asc()).all()
    return render_template('index.html', tasks=tasks, apps=AVAILABLE_APPS)

@app.route('/add_task', methods=['POST'])   # Define the route to add task and allows only POST (form submission)
def add_task():                             # Function executed when the form sends data to this route
    # Handle task creation
    title = request.form.get('title')                               # Retrieve the value of the title field
    description = request.form.get('description')                   # Retrieve the value of the description field
    due_date_str = request.form.get('due_date')                     # Retrieve the value of the due date field
    due_date = datetime.strptime(due_date_str, '%Y-%m-%d').date()   # Convert due date into a date format
    app_uri = request.form.get('app_uri')                           # Retrieve the URI scheme (if applicable)
    code_snippet = request.form.get('code_snippet')                 # Retrieve the code snippet scheme (if applicable)
    git_branch = request.form.get('git_branch')                     # Retrieve the git branch name (if applicable)
    github_username = request.form.get('github_username')           # Retrieve GitHub username (if applicable)
    github_repo = request.form.get('github_repo')                   # Retrieve GitHub repo name (if applicable)
    version_info = request.form.get('version_info')                 # Retrieve version info (if applicable)    

    # Create new task object by assigning corresponding values
    new_task = Task(
        title=title,
        description=description if description else None,
        due_date=due_date,
        app_uri=app_uri if app_uri else None,
        code_snippet=code_snippet if code_snippet else None,
        git_branch=git_branch if git_branch else None,
        github_username=github_username if github_username else None,
        github_repo=github_repo if github_repo else None,
        version_info=version_info if version_info else None
    )
    
    db.session.add(new_task)    # Prepare the insert of the task to the database
    db.session.commit()         # COmmit the insert

    return redirect(url_for('index'))   # Reload the page

# Make the function available inside all Jinja templates
@app.context_processor                             
def utility_processor():                     
    return dict(get_app_by_uri=get_app_by_uri)  

@app.route('/toggle_task/<int:task_id>')    # Route used to change the status of a task (mark as done / undo)
def toggle_task(task_id):                   
    # Search for the task by its ID.
    # If the task does not exist, Flask automatically returns a 404 error page.
    task = Task.query.get_or_404(task_id)
    
    # Check the task current status and flip it:
    if task.status == 'done':                           # If status is done
        task.status = 'todo'                            # Mark it as to do
        print(f"Task unmarked: {task.title}")           # Print info in terminal
    else:                                               # If the task was to do
        task.status = 'done'                            # Mark it as done
        print(f"Task marked as done: {task.title}")     # Print info in terminal
    
    db.session.commit()                 # Save the updated task status to the database    
    return redirect(url_for('index'))   # Reload the page after the update

@app.route('/delete_task/<int:task_id>')    # Route used to delete a task
def delete_task(task_id):
    task = Task.query.get_or_404(task_id)

    print(f"Task deleted: {task.title}")    # Print info in terminal
    db.session.delete(task)                 # Effectively delete task from database
    db.session.commit()                     # Save changes to database

    return redirect(url_for('index'))   # Reload the page after the update

# ========================================
# APPLICATION STARTUP
# ========================================

if __name__ == '__main__':
    # Create database if non existant
    with app.app_context():
        db.create_all()
        print(f"Database initialized! ({Task.query.count()} existing tasks)")
    
    # Display startup messages in terminal
    print("Open your browser at: http://127.0.0.1:8080")
    # Start the Flask development server
    app.run(debug=True, host='127.0.0.1', port=8080)
