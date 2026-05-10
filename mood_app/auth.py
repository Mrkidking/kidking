from flask import Blueprint, request, jsonify, current_app
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
import re
from models import db, User

auth_bp = Blueprint("auth", __name__)

EMAIL_RE = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")


@auth_bp.route("/api/register", methods=["POST"])
def register():
    data = request.get_json()
    if not data:
        return jsonify({"error": "请提供注册信息"}), 400
    username = data.get("username", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not username or not email or not password:
        return jsonify({"error": "请填写所有字段"}), 400
    if len(username) < 2:
        return jsonify({"error": "用户名至少2个字符"}), 400
    if len(username) > 20:
        return jsonify({"error": "用户名最多20个字符"}), 400
    if not EMAIL_RE.match(email):
        return jsonify({"error": "邮箱格式不正确"}), 400
    if len(password) < 6:
        return jsonify({"error": "密码至少6个字符"}), 400
    if User.query.filter_by(username=username).first():
        return jsonify({"error": "用户名已存在"}), 409
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "邮箱已被注册"}), 409

    user = User(username=username, email=email,
                password_hash=generate_password_hash(password))
    db.session.add(user)
    db.session.commit()
    token = create_access_token(identity=str(user.id))
    return jsonify({"message": "注册成功", "token": token, "user": user.to_dict()}), 201


@auth_bp.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()
    if not data:
        return jsonify({"error": "请提供登录信息"}), 400
    login_id = data.get("login", "").strip()
    password = data.get("password", "")

    if not login_id or not password:
        return jsonify({"error": "请输入用户名/邮箱和密码"}), 400

    # Try email first, then username
    user = User.query.filter_by(email=login_id.lower()).first()
    if not user:
        user = User.query.filter_by(username=login_id).first()

    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({"error": "用户名或密码错误"}), 401

    token = create_access_token(identity=str(user.id))
    return jsonify({"message": "登录成功", "token": token, "user": user.to_dict()}), 200


@auth_bp.route("/api/profile", methods=["PUT"])
@jwt_required()
def update_profile():
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)
    data = request.get_json()
    if not data:
        return jsonify({"error": "请提供更新内容"}), 400

    if "username" in data:
        new_username = data["username"].strip()
        if not new_username or len(new_username) < 2:
            return jsonify({"error": "用户名至少2个字符"}), 400
        if len(new_username) > 20:
            return jsonify({"error": "用户名最多20个字符"}), 400
        existing = User.query.filter_by(username=new_username).first()
        if existing and existing.id != user_id:
            return jsonify({"error": "用户名已被占用"}), 409
        user.username = new_username

    if "email" in data:
        new_email = data["email"].strip().lower()
        if not EMAIL_RE.match(new_email):
            return jsonify({"error": "邮箱格式不正确"}), 400
        existing = User.query.filter_by(email=new_email).first()
        if existing and existing.id != user_id:
            return jsonify({"error": "邮箱已被占用"}), 409
        user.email = new_email

    if "bio" in data:
        bio = data["bio"].strip()
        if len(bio) > 200:
            return jsonify({"error": "简介不能超过200字"}), 400
        user.bio = bio

    if "avatar_emoji" in data:
        emoji = data["avatar_emoji"].strip()
        if len(emoji) > 10:
            return jsonify({"error": "头像表情过长"}), 400
        user.avatar_emoji = emoji

    if "avatar_color" in data:
        color = data["avatar_color"].strip()
        if color not in current_app.config["AVATAR_COLORS"]:
            return jsonify({"error": "无效的颜色"}), 400
        user.avatar_color = color

    if "theme" in data:
        theme = data["theme"].strip()
        if theme not in ("purple", "warm", "ocean", "forest", "sunset"):
            return jsonify({"error": "无效的主题"}), 400
        user.theme = theme

    db.session.commit()
    return jsonify({"message": "资料已更新", "user": user.to_dict()})


@auth_bp.route("/api/profile/<int:user_id>", methods=["GET"])
def get_profile(user_id):
    user = User.query.get_or_404(user_id)
    return jsonify(user.profile_dict())


@auth_bp.route("/api/password", methods=["PUT"])
@jwt_required()
def change_password():
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)
    data = request.get_json()
    if not data:
        return jsonify({"error": "请提供密码信息"}), 400
    old_pw = data.get("old_password", "")
    new_pw = data.get("new_password", "")
    if not check_password_hash(user.password_hash, old_pw):
        return jsonify({"error": "原密码错误"}), 400
    if len(new_pw) < 6:
        return jsonify({"error": "新密码至少6个字符"}), 400
    user.password_hash = generate_password_hash(new_pw)
    db.session.commit()
    return jsonify({"message": "密码修改成功"})


@auth_bp.route("/api/account", methods=["DELETE"])
@jwt_required()
def delete_account():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    if not data or data.get("confirm", "").strip() != "再见":
        return jsonify({"error": "请输入'再见'确认删除"}), 400
    user = User.query.get_or_404(user_id)
    db.session.delete(user)
    db.session.commit()
    return jsonify({"message": "你的所有心事都已随风散去。祝你接下来一切安好。"})


@auth_bp.route("/api/users/search", methods=["GET"])
def search_users():
    q = request.args.get("q", "").strip()
    if not q or len(q) < 1:
        return jsonify([])
    users = User.query.filter(User.username.contains(q)).limit(20).all()
    return jsonify([u.to_dict() for u in users])
