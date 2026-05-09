from datetime import datetime, timezone
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = "user"
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    bio = db.Column(db.String(200), default="")
    avatar_emoji = db.Column(db.String(10), default="")
    avatar_color = db.Column(db.String(20), default="purple")
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    records = db.relationship("MoodRecord", back_populates="author", lazy="dynamic",
                              cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "bio": self.bio,
            "avatar_emoji": self.avatar_emoji,
            "avatar_color": self.avatar_color,
            "created_at": self.created_at.isoformat(),
        }

    def profile_dict(self):
        return {
            **self.to_dict(),
            "mood_count": self.records.count(),
            "friend_count": FriendRequest.friend_count(self.id),
            "family_count": FamilyMember.query.filter_by(user_id=self.id).count(),
        }


class MoodRecord(db.Model):
    __tablename__ = "mood_record"
    MOOD_CHOICES = ["happy", "calm", "sad", "anxious", "excited", "tired"]

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    mood = db.Column(db.String(20), nullable=False)
    content = db.Column(db.Text, nullable=False)
    tags = db.Column(db.String(200), default="")
    image = db.Column(db.String(300), default="")
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    author = db.relationship("User", back_populates="records")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "username": self.author.username,
            "mood": self.mood,
            "content": self.content,
            "tags": [t.strip() for t in self.tags.split(",") if t.strip()],
            "image": self.image,
            "created_at": self.created_at.isoformat(),
        }


class FamilyGroup(db.Model):
    __tablename__ = "family_group"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False)
    description = db.Column(db.String(200), default="")
    invite_code = db.Column(db.String(6), unique=True, nullable=False)
    creator_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    creator = db.relationship("User", foreign_keys=[creator_id])
    members = db.relationship("FamilyMember", back_populates="group", lazy="dynamic",
                              cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "invite_code": self.invite_code,
            "creator_id": self.creator_id,
            "creator_name": self.creator.username,
            "member_count": self.members.count(),
            "created_at": self.created_at.isoformat(),
        }


class FamilyMember(db.Model):
    __tablename__ = "family_member"
    id = db.Column(db.Integer, primary_key=True)
    group_id = db.Column(db.Integer, db.ForeignKey("family_group.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    joined_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    group = db.relationship("FamilyGroup", back_populates="members")
    user = db.relationship("User")
    __table_args__ = (db.UniqueConstraint("group_id", "user_id"),)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "username": self.user.username,
            "joined_at": self.joined_at.isoformat(),
        }


class FriendRequest(db.Model):
    __tablename__ = "friend_request"
    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    status = db.Column(db.String(20), default="pending")
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    sender = db.relationship("User", foreign_keys=[sender_id])
    receiver = db.relationship("User", foreign_keys=[receiver_id])
    __table_args__ = (db.UniqueConstraint("sender_id", "receiver_id"),)

    @staticmethod
    def are_friends(a, b):
        return FriendRequest.query.filter(
            db.or_(
                db.and_(FriendRequest.sender_id == a, FriendRequest.receiver_id == b,
                        FriendRequest.status == "accepted"),
                db.and_(FriendRequest.sender_id == b, FriendRequest.receiver_id == a,
                        FriendRequest.status == "accepted"),
            )
        ).first() is not None

    @staticmethod
    def friend_count(uid):
        s = FriendRequest.query.filter_by(sender_id=uid, status="accepted").count()
        r = FriendRequest.query.filter_by(receiver_id=uid, status="accepted").count()
        return s + r

    @staticmethod
    def friend_ids(uid):
        sent = [r.receiver_id for r in
                FriendRequest.query.filter_by(sender_id=uid, status="accepted").all()]
        recv = [r.sender_id for r in
                FriendRequest.query.filter_by(receiver_id=uid, status="accepted").all()]
        return list(set(sent + recv))

    def to_dict(self):
        return {
            "id": self.id,
            "sender_id": self.sender_id,
            "sender_name": self.sender.username,
            "receiver_id": self.receiver_id,
            "receiver_name": self.receiver.username,
            "status": self.status,
            "created_at": self.created_at.isoformat(),
        }
