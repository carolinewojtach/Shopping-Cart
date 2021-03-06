const fs = require("fs");

const express = require("express");
const router = express.Router();

const accessAuth = require("./accessAuth");

const usersList = "users.json";
let users = JSON.parse(fs.readFileSync(usersList, "utf8"));
const productsList = "products.json";
let products = JSON.parse(fs.readFileSync(productsList, "utf8"));

router.all("*", accessAuth);

router
  .route("/cart/:product_id?/:p_amount?")
  // SHOW CART
  .get((req, res) => {
    // user which is sign in
    const user = req.user;
    const { product_id } = req.params;

    if (product_id) {
      const product = user.cart.find(p => p.id === +product_id);
      if (product) res.send(product);
      else res.status(404).send("You don't have such product in your cart");
    } else {
      if (user.cart.length === 0) res.send("Your cart is empty");
      else res.send(user.cart);
    }
  })
  // ADD PRODUCT TO CART
  .post((req, res) => {
    let user = req.user;
    const { product_id, p_amount } = req.params;

    if (product_id) {
      const product = products.find(p => p.id === +product_id);

      if (+p_amount <= product.amount) {
        const productLeft = {
          id: product.id,
          ...product,
          amount: product.amount - +p_amount
        };

        // update cart
        // check if such product is in cart already
        let productInCart = user.cart.find(e => e.id === product.id);

        if (productInCart) {
          productInCart = {
            id: product.id,
            ...productInCart,
            amount: productInCart.amount + +p_amount
          };

          const productInCartIndex = user.cart.findIndex(
            p => p.id === product.id
          );
          user.cart[productInCartIndex] = productInCart;
        } else {
          productInCart = {
            id: product.id,
            ...product,
            amount: +p_amount
          };

          user.cart.push(productInCart);
        }

        const userIndex = users.findIndex(u => u.id === user.id);
        users[userIndex].cart = user.cart;
        fs.writeFileSync(usersList, JSON.stringify(users));

        // update amount of products left in store
        const productIndex = products.findIndex(p => p.id === product.id);
        products[productIndex] = productLeft;
        fs.writeFileSync(productsList, JSON.stringify(products));

        res
          .status(201)
          .send(`Product: ${productInCart.name} added to your cart`);
      } else {
        res
          .status(401)
          .send(`Only ${product.amount} items available in our store`);
      }
    } else {
      res.status(404).send("We don't have such a product in our store");
    }
  })
  // DELETE PRODUCT FROM CART
  .delete((req, res) => {
    const user = req.user;
    const { product_id } = req.params;

    if (product_id) {
      const product = products.find(p => p.id === +product_id);
      const productInCart = user.cart.find(p => p.id === +product_id);

      if (productInCart) {
        const productReturned = {
          id: product.id,
          ...product,
          amount: product.amount + productInCart.amount
        };

        // update cart
        user.cart = user.cart.filter(p => p.id !== +product_id);
        const userIndex = users.findIndex(u => u.id === user.id);
        users[userIndex] = user;
        fs.writeFileSync(usersList, JSON.stringify(users));

        // return products to store
        const productIndex = products.findIndex(p => p.id === product.id);
        products[productIndex] = productReturned;
        fs.writeFileSync(productsList, JSON.stringify(products));

        res
          .status(201)
          .send(`You deleted product: ${product.name} from your cart`);
      } else res.status(404).send("You don't have such a product in your cart");
    } else {
      res
        .status(404)
        .send("You have to pass product id to delete the product from cart");
    }
  });

module.exports = router;
