import { cartSignature } from "./checkout";
import {
  addToCart,
  DomainError,
  getProductDetails,
  prepareCheckout,
  restoreCart,
  setCartQuantity,
} from "./domain";
import type { Cart } from "./validation";

export const cartStorageKey = "office-supply.cart.v1";
export type CheckoutSummary = ReturnType<typeof prepareCheckout>;
export type ShopState = {
  cart: Cart;
  revision: number;
  review: { summary: CheckoutSummary; revision: number } | null;
  hydrated: boolean;
  message: string;
  error: string;
};

export const initialShopState: ShopState = {
  cart: [],
  revision: 0,
  review: null,
  hydrated: false,
  message: "",
  error: "",
};

export type ShopAction =
  | { type: "hydrate"; serialized: string | null }
  | { type: "add"; productId: string; quantity: number }
  | { type: "set"; productId: string; quantity: number }
  | { type: "adjust"; productId: string; delta: 1 | -1 }
  | { type: "review" }
  | { type: "cancel-review" }
  | { type: "reset" }
  | { type: "clear-cart" }
  | { type: "paid"; signature: string }
  | { type: "dismiss-feedback" };

export function shopReducer(state: ShopState, action: ShopAction): ShopState {
  try {
    switch (action.type) {
      case "paid":
        if (cartSignature(state.cart) !== action.signature) return state;
        return {
          ...state,
          cart: [],
          revision: state.revision + 1,
          review: null,
          message: "Test payment confirmed.",
          error: "",
        };
      case "hydrate":
        return {
          ...state,
          cart: restoreCart(action.serialized),
          hydrated: true,
          review: null,
        };
      case "add":
      case "adjust":
      case "set": {
        const operation = action.type === "add" ? addToCart : setCartQuantity;
        const quantity =
          action.type === "adjust"
            ? (state.cart.find((item) => item.productId === action.productId)
                ?.quantity ?? 0) + action.delta
            : action.quantity;
        const cart = operation(state.cart, {
          productId: action.productId,
          quantity,
        });
        const product = getProductDetails(action.productId);
        return {
          ...state,
          cart,
          revision: state.revision + 1,
          review: null,
          error: "",
          message:
            action.type === "add"
              ? `${product.name} added to your cart.`
              : `Quantity updated for ${product.name}.`,
        };
      }
      case "review":
        return {
          ...state,
          review: {
            summary: prepareCheckout(state.cart),
            revision: state.revision,
          },
          error: "",
          message: "Your order is ready to review.",
        };
      case "cancel-review":
        return { ...state, review: null };
      case "clear-cart":
      case "reset":
        return {
          ...initialShopState,
          hydrated: true,
          revision: state.revision + 1,
          message:
            action.type === "reset"
              ? "Demo reset. Your cart is empty."
              : "Your cart is empty.",
        };
      case "dismiss-feedback":
        return { ...state, message: "", error: "" };
    }
  } catch (error) {
    return {
      ...state,
      error:
        error instanceof DomainError
          ? error.message
          : "Something went wrong. Please try again.",
      message: "",
    };
  }
}
