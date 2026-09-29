module.exports = (sequelize, DataTypes) => {
  const PlanTask = sequelize.define(
    "PlanTask",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      plan_day_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "plan_days",
          key: "id",
          onDelete: "CASCADE",
        },
      },

      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },

      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      status: {
        type: DataTypes.ENUM(
          "pending",
          "completed",
          "cancelled"
        ),
        allowNull: false,
        defaultValue: "pending",
      },
    },
    {
      tableName: "plan_tasks",
      underscored: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      timestamps: true,
    }
  );

  PlanTask.associate = (models) => {
    PlanTask.belongsTo(models.PlanDay, {
      foreignKey: "plan_day_id",
      as: "planDay",
      onDelete: "CASCADE",
    });
  };

  return PlanTask;
};