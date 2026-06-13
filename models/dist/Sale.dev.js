"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _db = _interopRequireDefault(require("../config/db.js"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var Sale =
/*#__PURE__*/
function () {
  function Sale() {
    _classCallCheck(this, Sale);
  }

  _createClass(Sale, null, [{
    key: "findAll",
    value: function findAll() {
      var userId,
          values,
          whereClause,
          result,
          _args = arguments;
      return regeneratorRuntime.async(function findAll$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              userId = _args.length > 0 && _args[0] !== undefined ? _args[0] : null;
              values = [];
              whereClause = userId ? "WHERE sales.user_id = $1" : "";

              if (userId) {
                values.push(userId);
              }

              _context.next = 6;
              return regeneratorRuntime.awrap(_db["default"].query("SELECT\n         sales.id,\n         sales.total_amount,\n         sales.created_at,\n         customers.name AS customer_name,\n         users.name AS user_name,\n         COUNT(sale_items.id)::int AS item_count\n       FROM sales\n       JOIN customers ON sales.customer_id = customers.id\n       LEFT JOIN users ON sales.user_id = users.id\n       LEFT JOIN sale_items ON sale_items.sale_id = sales.id\n       ".concat(whereClause, "\n       GROUP BY sales.id, customers.name, users.name\n       ORDER BY sales.created_at DESC"), values));

            case 6:
              result = _context.sent;
              return _context.abrupt("return", result.rows);

            case 8:
            case "end":
              return _context.stop();
          }
        }
      });
    }
  }, {
    key: "findByIdWithItems",
    value: function findByIdWithItems(id) {
      var saleResult, sale, itemsResult;
      return regeneratorRuntime.async(function findByIdWithItems$(_context2) {
        while (1) {
          switch (_context2.prev = _context2.next) {
            case 0:
              _context2.next = 2;
              return regeneratorRuntime.awrap(_db["default"].query("SELECT\n         sales.id,\n         sales.customer_id,\n         sales.user_id,\n         sales.total_amount,\n         sales.status,\n         sales.created_at,\n         customers.name AS customer_name,\n         users.name AS user_name\n       FROM sales\n       JOIN customers ON sales.customer_id = customers.id\n       LEFT JOIN users ON sales.user_id = users.id\n       WHERE sales.id = $1\n       LIMIT 1", [id]));

            case 2:
              saleResult = _context2.sent;
              sale = saleResult.rows[0];

              if (sale) {
                _context2.next = 6;
                break;
              }

              return _context2.abrupt("return", null);

            case 6:
              _context2.next = 8;
              return regeneratorRuntime.awrap(_db["default"].query("SELECT\n         sale_items.id,\n         sale_items.product_id,\n         sale_items.quantity,\n         sale_items.unit_price,\n         sale_items.total_price,\n         products.name AS product_name,\n         products.sku\n       FROM sale_items\n       LEFT JOIN products ON sale_items.product_id = products.id\n       WHERE sale_items.sale_id = $1\n       ORDER BY sale_items.id ASC", [id]));

            case 8:
              itemsResult = _context2.sent;
              return _context2.abrupt("return", {
                sale: sale,
                items: itemsResult.rows
              });

            case 10:
            case "end":
              return _context2.stop();
          }
        }
      });
    }
  }, {
    key: "create",
    value: function create(_ref) {
      var customerId, userId, items, client, saleResult, saleId, totalAmount, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, item, productId, quantity, productResult, product, lineTotal, previousQuantity, newQuantity;

      return regeneratorRuntime.async(function create$(_context3) {
        while (1) {
          switch (_context3.prev = _context3.next) {
            case 0:
              customerId = _ref.customerId, userId = _ref.userId, items = _ref.items;

              if (customerId) {
                _context3.next = 3;
                break;
              }

              throw new Error("Customer is required.");

            case 3:
              if (!(!Array.isArray(items) || items.length === 0)) {
                _context3.next = 5;
                break;
              }

              throw new Error("At least one product is required for a sale.");

            case 5:
              _context3.next = 7;
              return regeneratorRuntime.awrap(_db["default"].connect());

            case 7:
              client = _context3.sent;
              _context3.prev = 8;
              _context3.next = 11;
              return regeneratorRuntime.awrap(client.query("BEGIN"));

            case 11:
              _context3.next = 13;
              return regeneratorRuntime.awrap(client.query("INSERT INTO sales (customer_id, user_id, total_amount)\n         VALUES ($1, $2, $3)\n         RETURNING id", [customerId, userId, 0]));

            case 13:
              saleResult = _context3.sent;
              saleId = saleResult.rows[0].id;
              totalAmount = 0;
              _iteratorNormalCompletion = true;
              _didIteratorError = false;
              _iteratorError = undefined;
              _context3.prev = 19;
              _iterator = items[Symbol.iterator]();

            case 21:
              if (_iteratorNormalCompletion = (_step = _iterator.next()).done) {
                _context3.next = 48;
                break;
              }

              item = _step.value;
              productId = Number(item.productId);
              quantity = Number(item.quantity);

              if (!(!productId || !Number.isInteger(quantity) || quantity <= 0)) {
                _context3.next = 27;
                break;
              }

              throw new Error("Each sale item must include a valid product and quantity.");

            case 27:
              _context3.next = 29;
              return regeneratorRuntime.awrap(client.query("SELECT id, quantity, unit_price\n           FROM products\n           WHERE id = $1\n           FOR UPDATE", [productId]));

            case 29:
              productResult = _context3.sent;
              product = productResult.rows[0];

              if (product) {
                _context3.next = 33;
                break;
              }

              throw new Error("Selected product does not exist.");

            case 33:
              if (!(product.quantity < quantity)) {
                _context3.next = 35;
                break;
              }

              throw new Error("Not enough stock for product ".concat(productId, "."));

            case 35:
              lineTotal = Number(product.unit_price) * quantity;
              previousQuantity = Number(product.quantity);
              newQuantity = previousQuantity - quantity;
              _context3.next = 40;
              return regeneratorRuntime.awrap(client.query("UPDATE products\n           SET quantity = $1,\n               updated_at = CURRENT_TIMESTAMP\n           WHERE id = $2", [newQuantity, productId]));

            case 40:
              _context3.next = 42;
              return regeneratorRuntime.awrap(client.query("INSERT INTO sale_items\n            (sale_id, product_id, quantity, unit_price, total_price)\n           VALUES ($1, $2, $3, $4, $5)", [saleId, productId, quantity, product.unit_price, lineTotal]));

            case 42:
              _context3.next = 44;
              return regeneratorRuntime.awrap(client.query("INSERT INTO stock_movements\n            (product_id, user_id, movement_type, quantity, previous_quantity, new_quantity, reason, notes)\n           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)", [productId, userId, 'OUT', quantity, previousQuantity, newQuantity, 'SALE', "Sale #".concat(saleId)]));

            case 44:
              totalAmount += lineTotal;

            case 45:
              _iteratorNormalCompletion = true;
              _context3.next = 21;
              break;

            case 48:
              _context3.next = 54;
              break;

            case 50:
              _context3.prev = 50;
              _context3.t0 = _context3["catch"](19);
              _didIteratorError = true;
              _iteratorError = _context3.t0;

            case 54:
              _context3.prev = 54;
              _context3.prev = 55;

              if (!_iteratorNormalCompletion && _iterator["return"] != null) {
                _iterator["return"]();
              }

            case 57:
              _context3.prev = 57;

              if (!_didIteratorError) {
                _context3.next = 60;
                break;
              }

              throw _iteratorError;

            case 60:
              return _context3.finish(57);

            case 61:
              return _context3.finish(54);

            case 62:
              _context3.next = 64;
              return regeneratorRuntime.awrap(client.query("UPDATE sales\n         SET total_amount = $1,\n             updated_at = CURRENT_TIMESTAMP\n         WHERE id = $2", [totalAmount, saleId]));

            case 64:
              _context3.next = 66;
              return regeneratorRuntime.awrap(client.query("COMMIT"));

            case 66:
              return _context3.abrupt("return", {
                id: saleId,
                total_amount: totalAmount
              });

            case 69:
              _context3.prev = 69;
              _context3.t1 = _context3["catch"](8);
              _context3.next = 73;
              return regeneratorRuntime.awrap(client.query("ROLLBACK"));

            case 73:
              throw _context3.t1;

            case 74:
              _context3.prev = 74;
              client.release();
              return _context3.finish(74);

            case 77:
            case "end":
              return _context3.stop();
          }
        }
      }, null, null, [[8, 69, 74, 77], [19, 50, 54, 62], [55,, 57, 61]]);
    }
  }]);

  return Sale;
}();

var _default = Sale;
exports["default"] = _default;