module.exports = (sequelize, DataTypes) => {
  const Plan = sequelize.define(
    "Plan",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
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

      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },

      goal: {
        type: DataTypes.TEXT,
        allowNull: false,
      },

      start_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },

      end_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },

      status: {
        type: DataTypes.ENUM(
          "draft",
          "active",
          "completed",
          "cancelled"
        ),
        allowNull: false,
        defaultValue: "draft",
      },

      available_days: {
        type: DataTypes.JSON,
        allowNull: true,
      },
    },
    {
      tableName: "plans",
      underscored: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      timestamps: true,
    }
  );

  Plan.associate = (models) => {
    Plan.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user",
      onDelete: "CASCADE",
    });

    Plan.hasMany(models.PlanDay, {
      foreignKey: "plan_id",
      as: "days",
      onDelete: "CASCADE",
    });
  };

  return Plan;
};