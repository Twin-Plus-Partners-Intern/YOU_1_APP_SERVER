module.exports = (sequelize, DataTypes) => {
  const StreakEntry = sequelize.define(
    "StreakEntry",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      streak_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "streaks",
          key: "id",
          onDelete: "CASCADE",
        },
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
          onDelete: "CASCADE",
        },
      },
      check_in_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      check_in_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      streak_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      tableName: "streak_entries",
      underscored: true,
      createdAt: "created_at",
      updatedAt: false,
      indexes: [
        {
          unique: true,
          fields: ["streak_id", "check_in_date"],
        },
      ],
    }
  );

  StreakEntry.associate = (models) => {
    StreakEntry.belongsTo(models.Streak, {
      foreignKey: "streak_id",
      as: "streak",
      onDelete: "CASCADE",
    });

    StreakEntry.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user",
      onDelete: "CASCADE",
    });
  };

  return StreakEntry;
};
