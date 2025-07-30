
'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useCart } from '@/contexts/cart-context';
import { X, ShoppingCart, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { CartItem } from '@/contexts/cart-context';
import type { Post as Product } from '@/lib/types';
import { ReviewForm } from '@/components/fintrack/review-form';

export default function CheckoutPage() {
  const { cartItems, removeFromCart, updateQuantity, clearCart, cartTotal, cartCount, addPurchasedProducts, purchasedProducts, reviewedProductIds } = useCart();
  const { toast } = useToast();
  const router = useRouter();
  const [isOrderComplete, setIsOrderComplete] = useState(false);
  const [purchasedItems, setPurchasedItems] = useState<CartItem[]>([]);

  const handleProceedToPayment = () => {
    toast({
      title: 'Success!',
      description: 'Your order has been placed.',
    });
    
    // Add items to purchased list
    addPurchasedProducts(cartItems);
    setPurchasedItems([...cartItems]);
    
    // Clear the cart
    clearCart();

    // Show order complete screen
    setIsOrderComplete(true);
  };
  
  const getPrice = (content: string) => {
    const priceMatch = content.match(/(\d+(\.\d+)?)$/);
    return priceMatch ? parseFloat(priceMatch[1]) : 0;
  };

  const getDisplayMedia = (product: Product) => {
    if (product.media && product.media.length > 0) {
      return product.media.find(m => m.type === 'image') || product.media[0];
    }
    if (product.mediaURL) {
      return { url: product.mediaURL, type: product.mediaType || 'image' };
    }
    return null;
  };
  
  const pendingReviews = useMemo(() => {
    return purchasedProducts.filter(p => !reviewedProductIds.includes(p.id) && !purchasedItems.some(item => item.product.id === p.id));
  }, [purchasedProducts, reviewedProductIds, purchasedItems]);

  return (
    <div className="flex flex-col h-screen bg-background">
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tighter text-primary">
              {isOrderComplete ? 'Order Successful!' : 'Your Shopping Cart'}
            </h1>
            {isOrderComplete && (
              <p className="mt-2 text-muted-foreground">Thank you for your purchase. Please rate the products you bought.</p>
            )}
          </div>

          {isOrderComplete ? (
            <div className="space-y-8">
              {purchasedItems.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Review Your New Items</CardTitle>
                  </CardHeader>
                  <CardContent className="divide-y">
                    {purchasedItems.map(item => {
                      const displayMedia = getDisplayMedia(item.product);
                      return (
                          <div key={item.product.id} className="py-6 space-y-4">
                          <div className="flex items-center gap-4">
                            {displayMedia && displayMedia.type === 'image' ? (
                                  <Image
                                  src={displayMedia.url}
                                  alt={item.product.authorName}
                                  width={80}
                                  height={80}
                                  className="rounded-md object-cover aspect-square"
                                  />
                              ) : (
                                  <div className="w-[80px] h-[80px] bg-secondary rounded-md flex items-center justify-center">
                                      <ImageIcon className="w-8 h-8 text-muted-foreground" />
                                  </div>
                              )}
                              <div className="flex-1 space-y-1">
                              <p className="font-semibold">{item.product.authorName}</p>
                              <p className="text-sm text-muted-foreground">${getPrice(item.product.content).toFixed(2)}</p>
                              </div>
                          </div>
                          <ReviewForm productId={item.product.id} />
                          </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}
              {pendingReviews.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Review Your Past Purchases</CardTitle>
                  </CardHeader>
                  <CardContent className="divide-y">
                    {pendingReviews.map(product => {
                      const displayMedia = getDisplayMedia(product);
                      return (
                          <div key={product.id} className="py-6 space-y-4">
                          <div className="flex items-center gap-4">
                            {displayMedia && displayMedia.type === 'image' ? (
                                  <Image
                                  src={displayMedia.url}
                                  alt={product.authorName}
                                  width={80}
                                  height={80}
                                  className="rounded-md object-cover aspect-square"
                                  />
                              ) : (
                                  <div className="w-[80px] h-[80px] bg-secondary rounded-md flex items-center justify-center">
                                      <ImageIcon className="w-8 h-8 text-muted-foreground" />
                                  </div>
                              )}
                              <div className="flex-1 space-y-1">
                              <p className="font-semibold">{product.authorName}</p>
                              <p className="text-sm text-muted-foreground">${getPrice(product.content).toFixed(2)}</p>
                              </div>
                          </div>
                          <ReviewForm productId={product.id} />
                          </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}
               <Card>
                <CardFooter className="pt-6">
                    <Button asChild variant="outline" className="w-full">
                        <Link href="/emarketplace">Continue Shopping</Link>
                    </Button>
                </CardFooter>
               </Card>
            </div>
          ) : cartCount > 0 ? (
            <div className="grid md:grid-cols-3 gap-8">
              <div className="md:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Cart Items ({cartCount})</CardTitle>
                  </CardHeader>
                  <CardContent className="divide-y">
                    {cartItems.map(item => {
                       const price = getPrice(item.product.content);
                       const displayMedia = getDisplayMedia(item.product);
                       return (
                          <div key={item.product.id} className="flex items-center gap-4 py-4">
                             {displayMedia && displayMedia.type === 'image' ? (
                                <Image
                                    src={displayMedia.url}
                                    alt={item.product.authorName}
                                    width={80}
                                    height={80}
                                    className="rounded-md object-cover aspect-square"
                                />
                             ) : (
                                <div className="w-[80px] h-[80px] bg-secondary rounded-md flex items-center justify-center">
                                    <ImageIcon className="w-8 h-8 text-muted-foreground" />
                                </div>
                             )}
                            <div className="flex-1 space-y-1">
                              <p className="font-semibold">{item.product.authorName}</p>
                              <p className="text-sm text-muted-foreground">${price.toFixed(2)}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateQuantity(item.product.id, parseInt(e.target.value, 10) || 1)}
                                className="w-16 h-9 text-center"
                              />
                            </div>
                            <p className="font-semibold w-20 text-right">
                              ${(price * item.quantity).toFixed(2)}
                            </p>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeFromCart(item.product.id)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <X className="h-5 w-5" />
                            </Button>
                          </div>
                       );
                    })}
                  </CardContent>
                </Card>
              </div>

              <div className="md:col-span-1">
                <Card className="sticky top-24">
                  <CardHeader>
                    <CardTitle>Order Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between">
                      <p className="text-muted-foreground">Subtotal</p>
                      <p>${cartTotal.toFixed(2)}</p>
                    </div>
                    <div className="flex justify-between">
                      <p className="text-muted-foreground">Shipping</p>
                      <p>Free</p>
                    </div>
                     <div className="flex justify-between font-bold text-lg">
                      <p>Total</p>
                      <p>${cartTotal.toFixed(2)}</p>
                    </div>
                  </CardContent>
                  <CardFooter className="flex-col gap-2">
                    <Button className="w-full" onClick={handleProceedToPayment}>
                      Proceed to Payment
                    </Button>
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/emarketplace">Shop More</Link>
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-16 border-2 border-dashed rounded-lg">
                <ShoppingCart className="mx-auto h-12 w-12 mb-4" />
                <h3 className="text-xl font-semibold">Your cart is empty</h3>
                <p className="mt-2">Looks like you haven't added anything to your cart yet.</p>
                <Button asChild className="mt-6">
                    <Link href="/emarketplace">Start Shopping</Link>
                </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
