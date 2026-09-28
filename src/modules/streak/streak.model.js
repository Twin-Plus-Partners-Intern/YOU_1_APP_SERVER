module.exports = (sequelize, DataTypes) => {
  const Streak = sequelize.define(
    "Streak",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: "users",
          key: "id",
          onDelete: "CASCADE",
        },
      },
      timezone: {
        type: DataTypes.STRING(64),
        allowNull: false,
        defaultValue: "UTC",
      },
      current_streak: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      longest_streak: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      total_check_ins: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      last_check_in_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      last_check_in_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "streaks",
      underscored: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  Streak.associate = (models) => {
    Streak.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user",
      onDelete: "CASCADE",
    });

    Streak.hasMany(models.StreakEntry, {
      foreignKey: "streak_id",
      as: "entries",
      onDelete: "CASCADE",
    });
  };

  return Streak;
};
