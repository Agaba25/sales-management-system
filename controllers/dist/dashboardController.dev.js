"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.showDashboard = void 0;

var _db = _interopRequireDefault(require("../config/db.js"));

var _Product = _interopRequireDefault(require("../models/Product.js"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var tableExists = function tableExists(tableName) {
  var result;
  return regeneratorRuntime.async(function tableExists$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          _context.next = 2;
          return regeneratorRuntime.awrap(_db["default"].query("SELECT to_regclass($1) AS table_name", ["public.".concat(tableName)]));

        case 2:
          result = _context.sent;
          return _context.abrupt("return", Boolean(result.rows[0].table_name));

        case 4:
        case "end":
          return _context.stop();
      }
    }
  });
};

var countRows = function countRows(tableName) {
  var whereClause,
      values,
      result,
      _args2 = arguments;
  return regeneratorRuntime.async(function countRows$(_context2) {
    while (1) {
      switch (_context2.prev = _context2.next) {
        case 0:
          whereClause = _args2.length > 1 && _args2[1] !== undefined ? _args2[1] : "";
          values = _args2.length > 2 && _args2[2] !== undefined ? _args2[2] : [];
          _context2.next = 4;
          return regeneratorRuntime.awrap(tableExists(tableName));

        case 4:
          if (_context2.sent) {
            _context2.next = 6;
            break;
          }

          return _context2.abrupt("return", 0);

        case 6:
          _context2.next = 8;
          return regeneratorRuntime.awrap(_db["default"].query("SELECT COUNT(*)::int AS total FROM ".concat(tableName, " ").concat(whereClause), values));

        case 8:
          result = _context2.sent;
          return _context2.abrupt("return", result.rows[0].total);

        case 10:
        case "end":
          return _context2.stop();
      }
    }
  });
};

var columnExists = function columnExists(tableName, columnName) {
  var result;
  return regeneratorRuntime.async(function columnExists$(_context3) {
    while (1) {
      switch (_context3.prev = _context3.next) {
        case 0:
          _context3.next = 2;
          return regeneratorRuntime.awrap(_db["default"].query("SELECT 1\n     FROM information_schema.columns\n     WHERE table_schema = 'public'\n       AND table_name = $1\n       AND column_name = $2\n     LIMIT 1", [tableName, columnName]));

        case 2:
          result = _context3.sent;
          return _context3.abrupt("return", result.rowCount > 0);

        case 4:
        case "end":
          return _context3.stop();
      }
    }
  });
};

var getInventorySummary = function getInventorySummary() {
  var productsExist, result;
  return regeneratorRuntime.async(function getInventorySummary$(_context4) {
    while (1) {
      switch (_context4.prev = _context4.next) {
        case 0:
          _context4.next = 2;
          return regeneratorRuntime.awrap(tableExists("products"));

        case 2:
          productsExist = _context4.sent;

          if (productsExist) {
            _context4.next = 5;
            break;
          }

          return _context4.abrupt("return", {
            totalProducts: 0,
            lowStockProducts: 0,
            outOfStockProducts: 0
          });

        case 5:
          _context4.next = 7;
          return regeneratorRuntime.awrap(columnExists("products", "quantity"));

        case 7:
          if (_context4.sent) {
            _context4.next = 12;
            break;
          }

          _context4.next = 10;
          return regeneratorRuntime.awrap(countRows("products"));

        case 10:
          _context4.t0 = _context4.sent;
          return _context4.abrupt("return", {
            totalProducts: _context4.t0,
            lowStockProducts: 0,
            outOfStockProducts: 0
          });

        case 12:
          _context4.next = 14;
          return regeneratorRuntime.awrap(_db["default"].query("\n    SELECT\n      COUNT(*)::int AS total_products,\n      COUNT(*) FILTER (WHERE quantity > 0 AND quantity <= 5)::int AS low_stock_products,\n      COUNT(*) FILTER (WHERE quantity = 0)::int AS out_of_stock_products\n    FROM products\n  "));

        case 14:
          result = _context4.sent;
          return _context4.abrupt("return", {
            totalProducts: result.rows[0].total_products,
            lowStockProducts: result.rows[0].low_stock_products,
            outOfStockProducts: result.rows[0].out_of_stock_products
          });

        case 16:
        case "end":
          return _context4.stop();
      }
    }
  });
};

var showDashboard = function showDashboard(req, res) {
  var _req$session$user, role, id, totalSales, totalActivities, activityCount, mySales, products;

  return regeneratorRuntime.async(function showDashboard$(_context5) {
    while (1) {
      switch (_context5.prev = _context5.next) {
        case 0:
          _req$session$user = req.session.user, role = _req$session$user.role, id = _req$session$user.id;
          _context5.prev = 1;

          if (!(role === "CEO")) {
            _context5.next = 34;
            break;
          }

          _context5.next = 5;
          return regeneratorRuntime.awrap(tableExists("sales"));

        case 5:
          if (!_context5.sent) {
            _context5.next = 11;
            break;
          }

          _context5.next = 8;
          return regeneratorRuntime.awrap(countRows("sales"));

        case 8:
          _context5.t0 = _context5.sent;
          _context5.next = 12;
          break;

        case 11:
          _context5.t0 = 0;

        case 12:
          totalSales = _context5.t0;
          _context5.next = 15;
          return regeneratorRuntime.awrap(tableExists("activity_logs"));

        case 15:
          if (!_context5.sent) {
            _context5.next = 21;
            break;
          }

          _context5.next = 18;
          return regeneratorRuntime.awrap(countRows("activity_logs"));

        case 18:
          _context5.t1 = _context5.sent;
          _context5.next = 22;
          break;

        case 21:
          _context5.t1 = 0;

        case 22:
          totalActivities = _context5.t1;
          _context5.t2 = res;
          _context5.next = 26;
          return regeneratorRuntime.awrap(countRows("products"));

        case 26:
          _context5.t3 = _context5.sent;
          _context5.t4 = totalSales;
          _context5.next = 30;
          return regeneratorRuntime.awrap(countRows("users"));

        case 30:
          _context5.t5 = _context5.sent;
          _context5.t6 = totalActivities;
          _context5.t7 = {
            title: "CEO Dashboard",
            totalProducts: _context5.t3,
            totalSales: _context5.t4,
            totalUsers: _context5.t5,
            totalActivities: _context5.t6
          };
          return _context5.abrupt("return", _context5.t2.render.call(_context5.t2, "dashboards/ceo", _context5.t7));

        case 34:
          if (!(role === "MANAGER")) {
            _context5.next = 52;
            break;
          }

          _context5.next = 37;
          return regeneratorRuntime.awrap(tableExists("activity_logs"));

        case 37:
          if (!_context5.sent) {
            _context5.next = 43;
            break;
          }

          _context5.next = 40;
          return regeneratorRuntime.awrap(countRows("activity_logs"));

        case 40:
          _context5.t8 = _context5.sent;
          _context5.next = 44;
          break;

        case 43:
          _context5.t8 = 0;

        case 44:
          activityCount = _context5.t8;
          _context5.t9 = res;
          _context5.next = 48;
          return regeneratorRuntime.awrap(getInventorySummary());

        case 48:
          _context5.t10 = _context5.sent;
          _context5.t11 = activityCount;
          _context5.t12 = {
            title: "Manager Dashboard",
            inventory: _context5.t10,
            activityCount: _context5.t11
          };
          return _context5.abrupt("return", _context5.t9.render.call(_context5.t9, "dashboards/manager", _context5.t12));

        case 52:
          if (!(role === "SALESPERSON")) {
            _context5.next = 67;
            break;
          }

          _context5.next = 55;
          return regeneratorRuntime.awrap(columnExists("sales", "user_id"));

        case 55:
          if (!_context5.sent) {
            _context5.next = 61;
            break;
          }

          _context5.next = 58;
          return regeneratorRuntime.awrap(countRows("sales", "WHERE user_id = $1", [id]));

        case 58:
          _context5.t13 = _context5.sent;
          _context5.next = 62;
          break;

        case 61:
          _context5.t13 = 0;

        case 62:
          mySales = _context5.t13;
          _context5.next = 65;
          return regeneratorRuntime.awrap(_Product["default"].findAvailable());

        case 65:
          products = _context5.sent;
          return _context5.abrupt("return", res.render("dashboards/salesperson", {
            title: "Salesperson Dashboard",
            mySales: mySales,
            products: products
          }));

        case 67:
          return _context5.abrupt("return", res.status(403).render("errors/403", {
            title: "Access denied"
          }));

        case 70:
          _context5.prev = 70;
          _context5.t14 = _context5["catch"](1);
          console.error("Dashboard error:", _context5.t14.message);
          req.flash("error", "Unable to load dashboard.");
          return _context5.abrupt("return", res.redirect("/auth/login"));

        case 75:
        case "end":
          return _context5.stop();
      }
    }
  }, null, null, [[1, 70]]);
};

exports.showDashboard = showDashboard;