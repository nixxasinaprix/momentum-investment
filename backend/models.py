"""Database models for Momentum Investment."""

from datetime import datetime, timezone
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text
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
    sector = db.Column(db.String(255), index=True, nullable=True)
    market_cap = db.Column(db.Float, nullable=True)
    last_updated = db.Column(db.DateTime(timezone=True), nullable=True)
    is_active = db.Column(db.Boolean, default=True, index=True, nullable=False)

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
        db.Index("ix_prices_date", "date"),
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


class BenchmarkPrice(db.Model):
    """Daily adjusted close price for a market benchmark index."""

    __tablename__ = "benchmark_prices"
    __table_args__ = (
        db.UniqueConstraint("symbol", "date", name="uq_benchmark_symbol_date"),
        db.Index("ix_benchmark_symbol_date", "symbol", "date"),
    )

    id = db.Column(db.Integer, primary_key=True)
    symbol = db.Column(db.String(32), nullable=False)
    date = db.Column(db.Date, nullable=False)
    close = db.Column(db.Float, nullable=False)

    def to_dict(self) -> dict:
        """Return serialized benchmark bar."""
        return {
            "symbol": self.symbol,
            "date": self.date.isoformat(),
            "close": self.close,
        }


class BacktestRun(db.Model):
    """Persisted backtest simulation run belonging to a user."""

    __tablename__ = "backtest_runs"
    __table_args__ = (
        db.Index("ix_backtest_runs_user_created", "user_id", "created_at"),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=False, index=True
    )
    created_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    params = db.Column(db.JSON, nullable=False)
    metrics = db.Column(db.JSON, nullable=False)
    result = db.Column(db.JSON, nullable=False)

    user = db.relationship("User", backref=db.backref("backtest_runs", lazy="dynamic"))

    def to_summary_dict(self) -> dict:
        """Return lightweight run metadata and headline metrics."""
        return {
            "id": self.id,
            "created_at": self.created_at.isoformat(),
            "params": self.params,
            "metrics": self.metrics,
        }

    def to_full_dict(self) -> dict:
        """Return full run details including equity curve and rebalances."""
        return {
            "id": self.id,
            "created_at": self.created_at.isoformat(),
            "params": self.params,
            "metrics": self.metrics,
            **(self.result or {}),
        }


def ensure_schema_columns() -> None:
    """Safely add new columns to existing SQLite tables if missing."""
    existing_cols = {
        row[1]
        for row in db.session.execute(text("PRAGMA table_info(stocks)")).all()
    }
    if "market_cap" not in existing_cols:
        db.session.execute(text("ALTER TABLE stocks ADD COLUMN market_cap FLOAT"))
    if "last_updated" not in existing_cols:
        db.session.execute(text("ALTER TABLE stocks ADD COLUMN last_updated DATETIME"))
    db.session.commit()
