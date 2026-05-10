import os
import uuid
from datetime import datetime, timedelta, timezone
from flask import Blueprint, request, jsonify, current_app, send_from_directory
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func
from models import db, User, MoodRecord, FamilyGroup, FamilyMember, FriendRequest

api_bp = Blueprint("api", __name__)


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in current_app.config["ALLOWED_EXTENSIONS"]


def save_upload(file):
    if file and file.filename and allowed_file(file.filename):
        ext = file.filename.rsplit(".", 1)[1].lower()
        name = f"{uuid.uuid4().hex}.{ext}"
        file.save(os.path.join(current_app.config["UPLOAD_FOLDER"], name))
        return name
    return ""


# ==================== Moods ====================

@api_bp.route("/api/moods", methods=["POST"])
@jwt_required()
def create_mood():
    user_id = int(get_jwt_identity())
    mood = request.form.get("mood", "").strip()
    content = request.form.get("content", "").strip()
    tags = request.form.get("tags", "")
    is_private = request.form.get("is_private", "false").lower() == "true"
    image = ""

    if mood not in MoodRecord.MOOD_CHOICES:
        return jsonify({"error": "无效的心情状态"}), 400
    if not content:
        return jsonify({"error": "请填写心情描述"}), 400
    if len(content) > 500:
        return jsonify({"error": "心情描述不能超过500字"}), 400

    file = request.files.get("image")
    if file:
        image = save_upload(file)
        if not image and file.filename:
            return jsonify({"error": "图片格式不支持（支持 png/jpg/jpeg/gif/webp）"}), 400

    record = MoodRecord(user_id=user_id, mood=mood, content=content, tags=tags,
                        is_private=is_private, image=image)
    db.session.add(record)
    db.session.commit()
    return jsonify({"message": "记录成功", "record": record.to_dict()}), 201


@api_bp.route("/api/moods", methods=["GET"])
def get_all_moods():
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    per_page = min(per_page, 50)
    mood_filter = request.args.get("mood", "").strip()

    query = MoodRecord.query.filter_by(is_private=False)
    if mood_filter and mood_filter in MoodRecord.MOOD_CHOICES:
        query = query.filter_by(mood=mood_filter)

    pagination = query.order_by(MoodRecord.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False)

    return jsonify({
        "records": [r.to_dict() for r in pagination.items],
        "total": pagination.total,
        "pages": pagination.pages,
        "page": page,
    })


@api_bp.route("/api/moods/my", methods=["GET"])
@jwt_required()
def get_my_moods():
    user_id = int(get_jwt_identity())
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    per_page = min(per_page, 50)
    pagination = MoodRecord.query.filter_by(user_id=user_id).order_by(
        MoodRecord.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
    return jsonify({
        "records": [r.to_dict() for r in pagination.items],
        "total": pagination.total,
        "pages": pagination.pages,
        "page": page,
    })


@api_bp.route("/api/moods/user/<int:user_id>", methods=["GET"])
def get_user_moods(user_id):
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    per_page = min(per_page, 50)
    date_filter = request.args.get("date", "").strip()

    query = MoodRecord.query.filter_by(user_id=user_id)
    if date_filter:
        try:
            filter_date = datetime.strptime(date_filter, "%Y-%m-%d").date()
            query = query.filter(
                db.cast(MoodRecord.created_at, db.Date) == filter_date
            )
        except ValueError:
            pass

    pagination = query.order_by(MoodRecord.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False)
    return jsonify({
        "records": [r.to_dict() for r in pagination.items],
        "total": pagination.total,
        "pages": pagination.pages,
        "page": page,
    })


@api_bp.route("/api/moods/<int:record_id>", methods=["PUT"])
@jwt_required()
def edit_mood(record_id):
    user_id = int(get_jwt_identity())
    record = MoodRecord.query.get_or_404(record_id)
    if record.user_id != user_id:
        return jsonify({"error": "只能编辑自己的心情记录"}), 403
    data = request.get_json()
    if not data:
        return jsonify({"error": "请提供更新内容"}), 400
    if "content" in data:
        content = data["content"].strip()
        if not content:
            return jsonify({"error": "内容不能为空"}), 400
        if len(content) > 500:
            return jsonify({"error": "心情描述不能超过500字"}), 400
        record.content = content
    if "mood" in data:
        mood = data["mood"].strip()
        if mood not in MoodRecord.MOOD_CHOICES:
            return jsonify({"error": "无效的心情状态"}), 400
        record.mood = mood
    if "tags" in data:
        record.tags = data["tags"]
    if "is_private" in data:
        record.is_private = data["is_private"]
    db.session.commit()
    return jsonify({"message": "更新成功", "record": record.to_dict()}), 200


@api_bp.route("/api/moods/<int:record_id>", methods=["DELETE"])
@jwt_required()
def delete_mood(record_id):
    user_id = int(get_jwt_identity())
    record = MoodRecord.query.get_or_404(record_id)
    if record.user_id != user_id:
        return jsonify({"error": "只能删除自己的心情记录"}), 403
    if record.image:
        path = os.path.join(current_app.config["UPLOAD_FOLDER"], record.image)
        if os.path.exists(path):
            os.remove(path)
    db.session.delete(record)
    db.session.commit()
    return jsonify({"message": "删除成功"}), 200


@api_bp.route("/api/stats", methods=["GET"])
def get_stats():
    total = MoodRecord.query.filter_by(is_private=False).count()
    user_count = User.query.count()
    mood_counts = db.session.query(
        MoodRecord.mood, func.count(MoodRecord.id)
    ).filter_by(is_private=False).group_by(MoodRecord.mood).all()
    distribution = {mood: 0 for mood in MoodRecord.MOOD_CHOICES}
    for mood, count in mood_counts:
        distribution[mood] = count
    top_users = db.session.query(
        User.username, func.count(MoodRecord.id).label("cnt")
    ).join(MoodRecord).filter_by(is_private=False).group_by(User.id).order_by(
        func.count(MoodRecord.id).desc()).limit(5).all()
    return jsonify({
        "total_records": total,
        "total_users": user_count,
        "mood_distribution": distribution,
        "top_users": [{"username": u, "count": c} for u, c in top_users],
    })


@api_bp.route("/api/stats/weekly", methods=["GET"])
@jwt_required()
def get_weekly_stats():
    user_id = int(get_jwt_identity())
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    records = MoodRecord.query.filter(
        MoodRecord.user_id == user_id,
        MoodRecord.created_at >= week_ago,
    ).order_by(MoodRecord.created_at.asc()).all()

    days = []
    for i in range(6, -1, -1):
        day = (datetime.now(timezone.utc) - timedelta(days=i)).strftime("%m-%d")
        days.append({"date": day, "mood": None, "emoji": ""})

    mood_emojis = {
        "happy": "😊", "calm": "😌", "sad": "😢",
        "anxious": "😰", "excited": "🤩", "tired": "😴",
    }

    for r in records:
        day_str = r.created_at.strftime("%m-%d")
        for d in days:
            if d["date"] == day_str:
                d["mood"] = r.mood
                d["emoji"] = mood_emojis.get(r.mood, "")

    distribution = {m: 0 for m in MoodRecord.MOOD_CHOICES}
    for r in records:
        distribution[r.mood] = distribution.get(r.mood, 0) + 1

    return jsonify({
        "total_this_week": len(records),
        "days": days,
        "distribution": distribution,
    })


# ==================== Family ====================

@api_bp.route("/api/families", methods=["POST"])
@jwt_required()
def create_family():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    if not data:
        return jsonify({"error": "请提供家庭组信息"}), 400
    name = data.get("name", "").strip()
    description = data.get("description", "").strip()
    if not name:
        return jsonify({"error": "家庭组名称不能为空"}), 400
    if len(name) > 80:
        return jsonify({"error": "名称最多80个字符"}), 400

    import random, string
    while True:
        code = "".join(random.choices(string.digits, k=6))
        if not FamilyGroup.query.filter_by(invite_code=code).first():
            break

    group = FamilyGroup(name=name, description=description, invite_code=code, creator_id=user_id)
    db.session.add(group)
    db.session.commit()
    # creator automatically joins
    member = FamilyMember(group_id=group.id, user_id=user_id)
    db.session.add(member)
    db.session.commit()
    return jsonify({"message": "创建成功", "group": group.to_dict()}), 201


@api_bp.route("/api/families/join", methods=["POST"])
@jwt_required()
def join_family():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    if not data:
        return jsonify({"error": "请提供邀请码"}), 400
    code = data.get("invite_code", "").strip()
    group = FamilyGroup.query.filter_by(invite_code=code).first()
    if not group:
        return jsonify({"error": "邀请码无效"}), 404
    existing = FamilyMember.query.filter_by(group_id=group.id, user_id=user_id).first()
    if existing:
        return jsonify({"error": "你已经在这个家庭组中"}), 409
    member = FamilyMember(group_id=group.id, user_id=user_id)
    db.session.add(member)
    db.session.commit()
    return jsonify({"message": "加入成功", "group": group.to_dict()})


@api_bp.route("/api/families/my", methods=["GET"])
@jwt_required()
def get_my_families():
    user_id = int(get_jwt_identity())
    memberships = FamilyMember.query.filter_by(user_id=user_id).all()
    groups = [m.group.to_dict() for m in memberships]
    return jsonify(groups)


@api_bp.route("/api/families/<int:group_id>", methods=["GET"])
@jwt_required()
def get_family_detail(group_id):
    user_id = int(get_jwt_identity())
    group = FamilyGroup.query.get_or_404(group_id)
    is_member = FamilyMember.query.filter_by(group_id=group_id, user_id=user_id).first() is not None
    members = [m.to_dict() for m in group.members.all()]
    return jsonify({
        **group.to_dict(),
        "members": members,
        "is_member": is_member,
        "is_creator": group.creator_id == user_id,
    })


@api_bp.route("/api/families/<int:group_id>/moods", methods=["GET"])
@jwt_required()
def get_family_moods(group_id):
    user_id = int(get_jwt_identity())
    is_member = FamilyMember.query.filter_by(group_id=group_id, user_id=user_id).first()
    if not is_member:
        return jsonify({"error": "你不是该家庭组的成员"}), 403
    member_ids = [m.user_id for m in FamilyMember.query.filter_by(group_id=group_id).all()]
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    per_page = min(per_page, 50)
    pagination = MoodRecord.query.filter(
        MoodRecord.user_id.in_(member_ids)
    ).order_by(MoodRecord.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False)
    return jsonify({
        "records": [r.to_dict() for r in pagination.items],
        "total": pagination.total,
        "pages": pagination.pages,
        "page": page,
    })


@api_bp.route("/api/families/<int:group_id>/leave", methods=["POST"])
@jwt_required()
def leave_family(group_id):
    user_id = int(get_jwt_identity())
    group = FamilyGroup.query.get_or_404(group_id)
    if group.creator_id == user_id:
        return jsonify({"error": "创建者不能退出，只能解散家庭组"}), 400
    member = FamilyMember.query.filter_by(group_id=group_id, user_id=user_id).first_or_404()
    db.session.delete(member)
    db.session.commit()
    return jsonify({"message": "已退出家庭组"})


@api_bp.route("/api/families/<int:group_id>", methods=["DELETE"])
@jwt_required()
def disband_family(group_id):
    user_id = int(get_jwt_identity())
    group = FamilyGroup.query.get_or_404(group_id)
    if group.creator_id != user_id:
        return jsonify({"error": "只有创建者可以解散家庭组"}), 403
    db.session.delete(group)
    db.session.commit()
    return jsonify({"message": "家庭组已解散"})


# ==================== Friends ====================

@api_bp.route("/api/friends/request/<int:user_id>", methods=["POST"])
@jwt_required()
def send_friend_request(user_id):
    sender_id = int(get_jwt_identity())
    if sender_id == user_id:
        return jsonify({"error": "不能添加自己为好友"}), 400
    if not User.query.get(user_id):
        return jsonify({"error": "用户不存在"}), 404
    existing = FriendRequest.query.filter_by(sender_id=sender_id, receiver_id=user_id).first()
    if existing:
        if existing.status == "accepted":
            return jsonify({"error": "你们已经是好友了"}), 409
        if existing.status == "pending":
            return jsonify({"error": "已经发送过好友请求"}), 409
        # previously rejected, re-send
        existing.status = "pending"
        db.session.commit()
        return jsonify({"message": "好友请求已发送"})
    # check reverse direction
    reverse = FriendRequest.query.filter_by(sender_id=user_id, receiver_id=sender_id).first()
    if reverse:
        if reverse.status == "accepted":
            return jsonify({"error": "你们已经是好友了"}), 409
        if reverse.status == "pending":
            # auto-accept
            reverse.status = "accepted"
            db.session.commit()
            return jsonify({"message": "你们已经是好友了！"})
        reverse.status = "pending"
        reverse.sender_id = sender_id
        reverse.receiver_id = user_id
        db.session.commit()
        return jsonify({"message": "好友请求已发送"})

    req = FriendRequest(sender_id=sender_id, receiver_id=user_id)
    db.session.add(req)
    db.session.commit()
    return jsonify({"message": "好友请求已发送"}), 201


@api_bp.route("/api/friends/respond/<int:request_id>", methods=["POST"])
@jwt_required()
def respond_friend_request(request_id):
    user_id = int(get_jwt_identity())
    data = request.get_json()
    action = data.get("action", "").strip() if data else ""
    if action not in ("accept", "reject"):
        return jsonify({"error": "action 必须是 accept 或 reject"}), 400

    req = FriendRequest.query.get_or_404(request_id)
    if req.receiver_id != user_id:
        return jsonify({"error": "无权处理该请求"}), 403
    if req.status != "pending":
        return jsonify({"error": "该请求已被处理"}), 409

    req.status = "accepted" if action == "accept" else "rejected"
    db.session.commit()
    return jsonify({"message": "已接受" if action == "accept" else "已拒绝"})


@api_bp.route("/api/friends/requests", methods=["GET"])
@jwt_required()
def get_friend_requests():
    user_id = int(get_jwt_identity())
    pending = FriendRequest.query.filter_by(receiver_id=user_id, status="pending").all()
    return jsonify([r.to_dict() for r in pending])


@api_bp.route("/api/friends", methods=["GET"])
@jwt_required()
def get_friends():
    user_id = int(get_jwt_identity())
    ids = FriendRequest.friend_ids(user_id)
    friends = User.query.filter(User.id.in_(ids)).all() if ids else []
    return jsonify([f.to_dict() for f in friends])


@api_bp.route("/api/friends/moods", methods=["GET"])
@jwt_required()
def get_friends_moods():
    user_id = int(get_jwt_identity())
    friend_ids = FriendRequest.friend_ids(user_id)
    if not friend_ids:
        return jsonify({"records": [], "total": 0, "pages": 0, "page": 1})
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    per_page = min(per_page, 50)
    pagination = MoodRecord.query.filter(
        MoodRecord.user_id.in_(friend_ids)
    ).order_by(MoodRecord.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False)
    return jsonify({
        "records": [r.to_dict() for r in pagination.items],
        "total": pagination.total,
        "pages": pagination.pages,
        "page": page,
    })


@api_bp.route("/api/friends/remove/<int:friend_id>", methods=["DELETE"])
@jwt_required()
def remove_friend(friend_id):
    user_id = int(get_jwt_identity())
    req = FriendRequest.query.filter(
        db.or_(
            db.and_(FriendRequest.sender_id == user_id, FriendRequest.receiver_id == friend_id),
            db.and_(FriendRequest.sender_id == friend_id, FriendRequest.receiver_id == user_id),
        ),
        FriendRequest.status == "accepted",
    ).first()
    if not req:
        return jsonify({"error": "好友关系不存在"}), 404
    db.session.delete(req)
    db.session.commit()
    return jsonify({"message": "已删除好友"})


# ==================== On This Day ====================

@api_bp.route("/api/moods/onthisday", methods=["GET"])
@jwt_required()
def on_this_day():
    user_id = int(get_jwt_identity())
    today = datetime.now(timezone.utc)
    records = MoodRecord.query.filter(
        MoodRecord.user_id == user_id,
        db.extract("month", MoodRecord.created_at) == today.month,
        db.extract("day", MoodRecord.created_at) == today.day,
        MoodRecord.created_at < today.replace(hour=0, minute=0, second=0, microsecond=0),
    ).order_by(MoodRecord.created_at.desc()).limit(10).all()
    return jsonify([r.to_dict() for r in records])


# ==================== Streak ====================

@api_bp.route("/api/stats/streak", methods=["GET"])
@jwt_required()
def get_streak():
    from sqlalchemy import distinct, cast, Date
    user_id = int(get_jwt_identity())
    # Get distinct dates the user posted
    dates = db.session.query(
        distinct(cast(MoodRecord.created_at, Date))
    ).filter(MoodRecord.user_id == user_id).order_by(
        cast(MoodRecord.created_at, Date).desc()
    ).limit(366).all()
    date_list = [d[0] for d in dates]
    if not date_list:
        return jsonify({"streak": 0, "total_days": 0})
    # Count consecutive days from today backwards
    today = datetime.now(timezone.utc).date()
    streak = 0
    check = today
    for d in date_list:
        if d == check or d == check - timedelta(days=1):
            streak += 1
            check = d
        else:
            break
    return jsonify({"streak": streak, "total_days": len(date_list)})


# ==================== Search & Export ====================

@api_bp.route("/api/moods/search", methods=["GET"])
@jwt_required()
def search_moods():
    user_id = int(get_jwt_identity())
    q = request.args.get("q", "").strip()
    mood = request.args.get("mood", "").strip()
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 30, type=int), 50)

    query = MoodRecord.query.filter_by(user_id=user_id)
    if q:
        query = query.filter(MoodRecord.content.contains(q))
    if mood and mood in MoodRecord.MOOD_CHOICES:
        query = query.filter_by(mood=mood)

    pagination = query.order_by(MoodRecord.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False)
    return jsonify({
        "records": [r.to_dict() for r in pagination.items],
        "total": pagination.total, "pages": pagination.pages, "page": page,
    })


@api_bp.route("/api/moods/export", methods=["GET"])
@jwt_required()
def export_moods():
    user_id = int(get_jwt_identity())
    records = MoodRecord.query.filter_by(user_id=user_id).order_by(
        MoodRecord.created_at.asc()).all()
    mood_names = {
        "happy": "开心", "calm": "平静", "sad": "难过", "anxious": "焦虑",
        "excited": "兴奋", "tired": "疲惫", "storm": "暴风雨", "chaos": "泥石流",
        "void": "虚空", "indescribable": "难以言说", "grateful": "感恩", "nostalgic": "怀旧",
    }
    data = []
    for r in records:
        data.append({
            "date": r.created_at.strftime("%Y-%m-%d %H:%M"),
            "mood": mood_names.get(r.mood, r.mood),
            "content": r.content,
            "tags": [t.strip() for t in r.tags.split(",") if t.strip()],
            "private": r.is_private,
        })
    return jsonify({"count": len(data), "records": data})


# ==================== Uploads ====================

@api_bp.route("/api/uploads/<filename>")
def uploaded_file(filename):
    return send_from_directory(current_app.config["UPLOAD_FOLDER"], filename)
