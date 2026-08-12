module.exports = (sequelize, DataTypes) => {
  const Session = sequelize.define(
    "Session",
    {
      session_id: {
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
      refresh_token: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      tableName: "sessions",
      underscored: true,
      createdAt: "created_at",
      updatedAt: false,
    }
  );

  Session.associate = (models) => {
    Session.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user",
      onDelete: "CASCADE",
    });
  };

  return Session;
};
