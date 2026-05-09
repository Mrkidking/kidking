from flask import Blueprint, request, jsonify, current_app
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from models import db, User

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/api/register", methods=["POST"])
def register():
    data = request.get_json()
    if not data:
        return jsonify({"error": "请提供注册信息"}), 400
    username = data.get("username", "").strip()
    password = data.get("password", "")
    if not username or not password:
        return jsonify({"error": "用户名和密码不能为空"}), 400
    if len(username) < 2:
        return jsonify({"error": "用户名至少2个字符"}), 400
    if len(username) > 20:
        return jsonify({"error": "用户名最多20个字符"}), 400
    if len(password) < 4:
        return jsonify({"error": "密码至少4个字符"}), 400
    if User.query.filter_by(username=username).first():
        return jsonify({"error": "用户名已存在"}), 409
    user = User(username=username, password_hash=generate_password_hash(password))
    db.session.add(user)
    db.session.commit()
    token = create_access_token(identity=str(user.id))
    return jsonify({"message": "注册成功", "token": token, "user": user.to_dict()}), 201


@auth_bp.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()
    if not data:
        return jsonify({"error": "请提供登录信息"}), 400
    username = data.get("username", "").strip()
    password = data.get("password", "")
    user = User.query.filter_by(username=username).first()
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
    if len(new_pw) < 4:
        return jsonify({"error": "新密码至少4个字符"}), 400
    user.password_hash = generate_password_hash(new_pw)
    db.session.commit()
    return jsonify({"message": "密码修改成功"})


@auth_bp.route("/api/users/search", methods=["GET"])
def search_users():
    q = request.args.get("q", "").strip()
    if not q or len(q) < 1:
        return jsonify([])
    users = User.query.filter(User.username.contains(q)).limit(20).all()
    return jsonify([u.to_dict() for u in users])
