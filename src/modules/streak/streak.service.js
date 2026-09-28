const { sequelize, User, Streak, StreakEntry } = require("../../models");
const { AppError } = require("../../core/middlewares/error.middleware");

const DEFAULT_TIMEZONE = "UTC";
const DEFAULT_HISTORY_LIMIT = 30;

class StreakService {
  async getMyStreak(userId, options = {}) {
    const historyLimit = this._normalizeLimit(options.limit);

    return sequelize.transaction(async (transaction) => {
      const user = await User.findByPk(userId, { transaction });

      if (!user) {
        throw new AppError(404, "User not found");
      }

      const streak = await this._getOrCreateStreak(userId, transaction);
      const now = new Date();
      const todayKey = this._getDateKey(now, streak.timezone);
      const yesterdayKey = this._shiftDateKey(todayKey, -1);

      await this._syncBrokenStreak(streak, todayKey, yesterdayKey, transaction);

      const entries = await StreakEntry.findAll({
        where: { streak_id: streak.id },
        order: [
          ["check_in_date", "DESC"],
          ["check_in_at", "DESC"],
        ],
        limit: historyLimit,
        transaction,
      });

      return {
        streak: this._serializeStreak(streak, now),
        entries: entries.map((entry) => this._serializeEntry(entry)),
      };
    });
  }

  async checkIn(userId, options = {}) {
    const timezone = options.timezone;

    return sequelize.transaction(async (transaction) => {
      const user = await User.findByPk(userId, { transaction });

      if (!user) {
        throw new AppError(404, "User not found");
      }

      const streak = await this._getOrCreateStreak(userId, transaction, timezone);
      const now = new Date();
      const todayKey = this._getDateKey(now, streak.timezone);
      const yesterdayKey = this._shiftDateKey(todayKey, -1);

      await this._syncBrokenStreak(streak, todayKey, yesterdayKey, transaction);

      if (streak.last_check_in_date === todayKey) {
        throw new AppError(409, "Streak has already been completed today");
      }

      const isConsecutiveDay = streak.last_check_in_date === yesterdayKey;
      const nextStreakCount = isConsecutiveDay ? streak.current_streak + 1 : 1;
      const nextLongestStreak = Math.max(streak.longest_streak, nextStreakCount);

      streak.current_streak = nextStreakCount;
      streak.longest_streak = nextLongestStreak;
      streak.total_check_ins += 1;
      streak.last_check_in_date = todayKey;
      streak.last_check_in_at = now;
      if (timezone) {
        streak.timezone = timezone;
      }

      await streak.save({ transaction });

      const entry = await StreakEntry.create(
        {
          streak_id: streak.id,
          user_id: userId,
          check_in_date: todayKey,
          check_in_at: now,
          streak_count: nextStreakCount,
        },
        { transaction }
      );

      return {
        streak: this._serializeStreak(streak, now),
        entry: this._serializeEntry(entry),
      };
    });
  }

  async getHistory(userId, options = {}) {
    return sequelize.transaction(async (transaction) => {
      const user = await User.findByPk(userId, { transaction });

      if (!user) {
        throw new AppError(404, "User not found");
      }

      const historyLimit = this._normalizeLimit(options.limit);
      const streak = await this._getOrCreateStreak(userId, transaction);

      const entries = await StreakEntry.findAll({
        where: { streak_id: streak.id },
        order: [
          ["check_in_date", "DESC"],
          ["check_in_at", "DESC"],
        ],
        limit: historyLimit,
        transaction,
      });

      return {
        streak: this._serializeStreak(streak),
        entries: entries.map((entry) => this._serializeEntry(entry)),
      };
    });
  }

  async _getOrCreateStreak(userId, transaction, timezone = null) {
    let streak = await Streak.findOne({
      where: { user_id: userId },
      transaction,
    });

    if (!streak) {
      return Streak.create(
        {
          user_id: userId,
          timezone: timezone || DEFAULT_TIMEZONE,
          current_streak: 0,
          longest_streak: 0,
          total_check_ins: 0,
        },
        { transaction }
      );
    }

    if (timezone && streak.timezone !== timezone) {
      streak.timezone = timezone;
      await streak.save({ transaction });
    }

    return streak;
  }

  async _syncBrokenStreak(streak, todayKey, yesterdayKey, transaction) {
    if (!streak.last_check_in_date) {
      return;
    }

    if (streak.last_check_in_date === todayKey) {
      return;
    }

    if (streak.last_check_in_date === yesterdayKey) {
      return;
    }

    if (streak.current_streak === 0) {
      return;
    }

    streak.current_streak = 0;
    await streak.save({ transaction });
  }

  _serializeStreak(streak, now = new Date()) {
    const values = typeof streak.toJSON === "function" ? streak.toJSON() : { ...streak };
    const timezone = values.timezone || DEFAULT_TIMEZONE;
    const todayKey = this._getDateKey(now, timezone);

    return {
      ...values,
      is_completed_today: values.last_check_in_date === todayKey,
      is_active: values.current_streak > 0,
    };
  }

  _serializeEntry(entry) {
    return typeof entry.toJSON === "function" ? entry.toJSON() : { ...entry };
  }

  _normalizeLimit(limit) {
    const parsedLimit = Number(limit);

    if (!Number.isInteger(parsedLimit) || parsedLimit <= 0) {
      return DEFAULT_HISTORY_LIMIT;
    }

    return Math.min(parsedLimit, 100);
  }

  _getDateKey(date, timezone) {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone || DEFAULT_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = formatter.formatToParts(date);
    const year = parts.find((part) => part.type === "year").value;
    const month = parts.find((part) => part.type === "month").value;
    const day = parts.find((part) => part.type === "day").value;

    return `${year}-${month}-${day}`;
  }

  _shiftDateKey(dateKey, days) {
    const shiftedDate = new Date(`${dateKey}T00:00:00.000Z`);
    shiftedDate.setUTCDate(shiftedDate.getUTCDate() + days);
    return shiftedDate.toISOString().slice(0, 10);
  }
}

module.exports = new StreakService();
