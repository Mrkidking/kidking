from flask import Blueprint, request, jsonify
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
    bio = data.get("bio", "").strip()
    if len(bio) > 200:
        return jsonify({"error": "简介不能超过200字"}), 400
    user.bio = bio
    db.session.commit()
    return jsonify({"message": "更新成功", "user": user.profile_dict()})


@auth_bp.route("/api/profile/<int:user_id>", methods=["GET"])
def get_profile(user_id):
    user = User.query.get_or_404(user_id)
    return jsonify(user.profile_dict())
