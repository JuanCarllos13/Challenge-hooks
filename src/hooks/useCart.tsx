import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart); // Transaformando no valor original // voltando o array
    }

    return [];
  });

  const prevCartRef = useRef<Product[]>();

  useEffect(()=> {
    prevCartRef.current = cart
  })

  const cartPreviousValue = prevCartRef.current ?? cart;  // se o primeiro valor for null ou undefined ele insere o da direta, se o dá direto for null ele aplica o da esquerda

  useEffect(() => {
    if(cartPreviousValue !== cart){ // se ele for diferente da versão dele anterior
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart))
    }
  }, [cart, cartPreviousValue])

  const addProduct = async (productId: number) => {
    try {
      const updatesCart = [...cart]
      const productExist = updatesCart.find(product => product.id === productId)

      const stock = await api.get(`/stock/${productId}`)

      const stockAmount = stock.data.amount
      const currentAmount = productExist ? productExist.amount : 0;

      const amount = currentAmount + 1

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return
      }

      if (productExist) {
        productExist.amount = amount
      } else {
        const product = await api.get(`/products/${productId}`)

        const newProduct = { //Passando um novo amount pro o produto novo
          ...product.data,
          amount: 1
        }
        updatesCart.push(newProduct)
      }
      setCart(updatesCart)
      // localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatesCart))

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart];
      const productIndex = updatedCart.findIndex(product => product.id === productId)

      if (productIndex >= 0) {
        updatedCart.splice(productIndex, 1) //remove
        setCart(updatedCart)
        // localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
      } else {
        throw Error()
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return
      }

      const stock = await api.get(`/stock/${productId}`)

      const stockAmount = stock.data.amount

      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return
      }
      const updatedCart = [...cart];
      const productExiste = updatedCart.find(product => product.id === productId)

      if (productExiste) {
        productExiste.amount = amount
        setCart(updatedCart)
        // localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
      } else {
        throw Error()
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
