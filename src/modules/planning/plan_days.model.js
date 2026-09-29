module.exports = (sequelize, DataTypes) => {
  const PlanDay = sequelize.define(
    "PlanDay",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      plan_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "plans",
          key: "id",
          onDelete: "CASCADE",
        },
      },

      week_num: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      day_num: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      scheduled_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },

      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
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
      tableName: "plan_days",
      underscored: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      timestamps: true,

      indexes: [
        {
          unique: true,
          fields: ["plan_id", "week_num", "day_num"],
        },
      ],
    }
  );

  PlanDay.associate = (models) => {
    PlanDay.belongsTo(models.Plan, {
      foreignKey: "plan_id",
      as: "plan",
      onDelete: "CASCADE",
    });

    PlanDay.hasMany(models.PlanTask, {
      foreignKey: "plan_day_id",
      as: "tasks",
      onDelete: "CASCADE",
    });
  };

  return PlanDay;
};