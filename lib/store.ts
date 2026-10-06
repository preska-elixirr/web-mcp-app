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
  receipt: CheckoutSummary | null;
  hydrated: boolean;
  message: string;
  error: string;
};

export const initialShopState: ShopState = {
  cart: [],
  revision: 0,
  review: null,
  receipt: null,
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
  | { type: "confirm" }
  | { type: "reset" }
  | { type: "dismiss-feedback" };

export function shopReducer(state: ShopState, action: ShopAction): ShopState {
  try {
    switch (action.type) {
      case "hydrate":
        return {
          ...state,
          cart: restoreCart(action.serialized),
          hydrated: true,
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
          receipt: null,
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
      case "confirm": {
        if (!state.review || state.review.revision !== state.revision) {
          return {
            ...state,
            error:
              "The cart changed. Review your order again before confirming.",
          };
        }
        const receipt = prepareCheckout(state.cart);
        return {
          ...state,
          cart: [],
          revision: state.revision + 1,
          review: null,
          receipt,
          error: "",
          message: "Demo order confirmed. Nothing has been purchased.",
        };
      }
      case "reset":
        return {
          ...initialShopState,
          hydrated: true,
          revision: state.revision + 1,
          message: "Demo reset. Your cart is empty.",
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
