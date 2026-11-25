"""Database models for Momentum Investment."""

from datetime import datetime, timezone
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import validates
from werkzeug.security import check_password_hash, generate_password_hash

db = SQLAlchemy()


class User(db.Model):
    """Registered user account."""

    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, index=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    @validates("email")
    def _normalize_email(self, _key, value):
        return value.strip().lower() if isinstance(value, str) else value

    def set_password(self, password: str) -> None:
        """Hash and store the user's password."""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        """Verify a plaintext password against the stored hash."""
        return check_password_hash(self.password_hash, password)

    def to_dict(self) -> dict:
        """Return safe public user fields (never the password hash)."""
        return {
            "id": self.id,
            "email": self.email,
        }


class Stock(db.Model):
    """Tracked NSE stock in the investment universe."""

    __tablename__ = "stocks"

    id = db.Column(db.Integer, primary_key=True)
    symbol = db.Column(db.String(32), unique=True, index=True, nullable=False)
    name = db.Column(db.String(255), nullable=False)
    sector = db.Column(db.String(255), nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)

    prices = db.relationship("Price", back_populates="stock", cascade="all, delete-orphan")

    def to_dict(self) -> dict:
        """Return public stock metadata."""
        return {
            "symbol": self.symbol,
            "name": self.name,
            "sector": self.sector,
        }


class Price(db.Model):
    """
    Daily adjusted OHLCV price bar for a stock.

    Prices are fetched with yfinance `auto_adjust=True` so splits, bonuses,
    and dividends are adjusted retroactively and do not create fake price jumps
    in momentum signals or backtests.
    """

    __tablename__ = "prices"
    __table_args__ = (
        db.UniqueConstraint("stock_id", "date", name="uq_prices_stock_date"),
        db.Index("ix_prices_stock_date", "stock_id", "date"),
    )

    id = db.Column(db.Integer, primary_key=True)
    stock_id = db.Column(db.Integer, db.ForeignKey("stocks.id"), nullable=False)
    date = db.Column(db.Date, nullable=False)
    open = db.Column(db.Float, nullable=True)
    high = db.Column(db.Float, nullable=True)
    low = db.Column(db.Float, nullable=True)
    close = db.Column(db.Float, nullable=False)
    volume = db.Column(db.BigInteger, nullable=True)

    stock = db.relationship("Stock", back_populates="prices")

    def to_dict(self) -> dict:
        """Return serialized OHLCV bar."""
        return {
            "date": self.date.isoformat(),
            "open": self.open,
            "high": self.high,
            "low": self.low,
            "close": self.close,
            "volume": self.volume,
        }
