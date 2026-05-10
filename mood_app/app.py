import os
from flask import Flask, render_template, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from sqlalchemy import text
from config import Config
from models import db
from auth import auth_bp
from api import api_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

    CORS(app)
    JWTManager(app)
    db.init_app(app)

    # Static file caching
    @app.after_request
    def add_cache_headers(response):
        if request.path.startswith("/static/"):
            ext = os.path.splitext(request.path)[1]
            if ext in (".css", ".js", ".json", ".svg"):
                response.cache_control.max_age = 86400  # 1 day
                response.cache_control.public = True
            elif ext in (".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico"):
                response.cache_control.max_age = 604800  # 7 days
                response.cache_control.public = True
        return response

    app.register_blueprint(auth_bp)
    app.register_blueprint(api_bp)

    @app.route("/")
    def index():
        return render_template("index.html")

    @app.errorhandler(404)
    def not_found(e):
        return render_template("404.html"), 404

    with app.app_context():
        db.create_all()
        try:
            db.session.execute(text("ALTER TABLE \"user\" ADD COLUMN IF NOT EXISTS theme VARCHAR(20) DEFAULT 'purple'"))
            db.session.commit()
        except Exception:
            db.session.rollback()
        try:
            db.session.execute(text("ALTER TABLE mood_record ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE"))
            db.session.commit()
        except Exception:
            db.session.rollback()
        try:
            db.session.execute(text("ALTER TABLE \"user\" ADD COLUMN IF NOT EXISTS email VARCHAR(120)"))
            db.session.commit()
        except Exception:
            db.session.rollback()
        # Create notification table if not exists
        try:
            db.session.execute(text("""
                CREATE TABLE IF NOT EXISTS notification (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    from_user_id INTEGER,
                    type VARCHAR(20) NOT NULL,
                    mood_id INTEGER,
                    is_read BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
            db.session.commit()
        except Exception:
            db.session.rollback()

    return app


app = create_app()

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
