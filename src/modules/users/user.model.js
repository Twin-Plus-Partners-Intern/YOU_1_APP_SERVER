module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    "User",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING(150),
        allowNull: false,
        unique: true,
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      role: {
        type: DataTypes.ENUM("user", "admin"),
        allowNull: false,
        defaultValue: "user",
      },
      status: {
        type: DataTypes.ENUM("pending_verify", "active", "inactive"),
        allowNull: false,
        defaultValue: "pending_verify",
      },
      google_id: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      facebook_id: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      apple_id: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      avatar_url: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "users",
      underscored: true,
      attributes: {
        createdAt: "created_at",
        updatedAt: "updated_at",
      },
      timestamps: true,
      defaultScope: {
        attributes: { exclude: ["password"] },
      },
      scopes: {
        withPassword: {
          attributes: {},
        },
      },
      hooks: {
        beforeCreate(user) {
          user.email = user.email.trim().toLowerCase();
        },
        beforeUpdate(user) {
          if (user.email) {
            user.email = user.email.trim().toLowerCase();
          }
        },
      },
    }
  );

  User.associate = (models) => {
    User.hasMany(models.Session, {
      foreignKey: "user_id",
      as: "sessions",
      onDelete: "CASCADE",
    });

    User.hasMany(models.OtpVerification, {
      foreignKey: "user_id",
      as: "otpVerifications",
      onDelete: "CASCADE",
    });
  };

  User.prototype.toJSON = function toJSON() {
    const values = { ...this.get() };
    delete values.password;
    return values;
  };

  return User;
};
