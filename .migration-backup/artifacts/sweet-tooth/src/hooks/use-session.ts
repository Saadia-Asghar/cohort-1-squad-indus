import { useState, useEffect } from "react";

export function useBuyerSession() {
  const [buyerId, setBuyerId] = useState<number>(1);
  const [bakerId, setBakerId] = useState<number>(1);

  useEffect(() => {
    const storedBuyerId = localStorage.getItem("buyerId");
    if (storedBuyerId) {
      setBuyerId(parseInt(storedBuyerId, 10));
    } else {
      localStorage.setItem("buyerId", "1");
    }

    const storedBakerId = localStorage.getItem("bakerId");
    if (storedBakerId) {
      setBakerId(parseInt(storedBakerId, 10));
    } else {
      localStorage.setItem("bakerId", "1");
    }
  }, []);

  return { buyerId, bakerId };
}
