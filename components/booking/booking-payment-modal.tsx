"use client";

import { useState, useEffect } from "react";
import {
    Elements,
    CardElement,
    useStripe,
    useElements
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Button } from "@/components/ui/button";

// Load Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface BookingPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    amount: number;
    therapistName: string;
    therapistId: number;
    onSuccess: (paymentIntentId: string) => void;
}

function CheckoutForm({ amount, therapistName, clientSecret, onSuccess, onClose }: {
    amount: number;
    therapistName: string;
    clientSecret: string;
    onSuccess: (id: string) => void;
    onClose: () => void;
}) {
    const stripe = useStripe();
    const elements = useElements();
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!stripe || !elements) return;

        setIsLoading(true);
        setErrorMessage(null);

        const cardElement = elements.getElement(CardElement);

        if (!cardElement) {
            setIsLoading(false);
            return;
        }

        try {
            const result = await stripe.confirmCardPayment(clientSecret, {
                payment_method: {
                    card: cardElement,
                    billing_details: {
                        // In a real app, pre-fill from user context
                        name: 'patient',
                    },
                },
            });

            if (result.error) {
                setErrorMessage(result.error.message || "Payment failed");
            } else if (result.paymentIntent && result.paymentIntent.status === "succeeded") {
                onSuccess(result.paymentIntent.id);
            }
        } catch (err: any) {
            setErrorMessage(err.message || "An unexpected error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    const cardStyle = {
        style: {
            base: {
                fontSize: "16px",
                color: "#32325d",
                fontFamily: '"Inter", sans-serif',
                "::placeholder": {
                    color: "#aab7c4",
                },
            },
            invalid: {
                color: "#fa755a",
                iconColor: "#fa755a",
            },
        },
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Session Payment</h3>
                <p className="text-sm text-gray-500 mt-1">
                    Pay <span className="font-bold text-gray-900">${(amount / 100).toFixed(2)}</span> for your session with {therapistName}.
                </p>
            </div>

            <div className="p-4 border rounded-md bg-gray-50">
                <CardElement options={cardStyle} />
            </div>

            {errorMessage && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
                    {errorMessage}
                </div>
            )}

            <div className="flex gap-3">
                <Button
                    type="button"
                    onClick={onClose}
                    className="flex-1 bg-black text-white hover:bg-gray-800"
                >
                    Cancel
                </Button>
                <Button
                    type="submit"
                    disabled={!stripe || isLoading}
                    className="flex-1 bg-black text-white hover:bg-gray-800"
                >
                    {isLoading ? "Processing..." : `Pay $${(amount / 100).toFixed(2)}`}
                </Button>
            </div>
        </form>
    );
}

export function BookingPaymentModal({
    isOpen,
    onClose,
    amount,
    therapistName,
    therapistId,
    onSuccess
}: BookingPaymentModalProps) {
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && therapistId) {
            // Fetch payment intent
            fetch("/api/booking/payment-intent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ therapistId }),
            })
                .then(async (res) => {
                    const data = await res.json();
                    if (res.ok) {
                        setClientSecret(data.clientSecret);
                    } else {
                        setError(data.error || "Failed to initialize payment");
                    }
                })
                .catch((err) => {
                    setError("Network error initializing payment");
                    console.error(err);
                });
        }
    }, [isOpen, therapistId]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden p-6 animate-in fade-in zoom-in duration-200">
                {error ? (
                    <div className="text-center py-6">
                        <p className="text-red-500 mb-4">{error}</p>
                        <Button onClick={onClose} className="w-full">Close</Button>
                    </div>
                ) : clientSecret ? (
                    <Elements stripe={stripePromise} options={{ clientSecret }}>
                        <CheckoutForm
                            amount={amount}
                            therapistName={therapistName}
                            clientSecret={clientSecret}
                            onSuccess={onSuccess}
                            onClose={onClose}
                        />
                    </Elements>
                ) : (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin h-8 w-8 border-4 border-gray-900 border-t-transparent rounded-full"></div>
                    </div>
                )}
            </div>
        </div>
    );
}
