import { Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import PaymentForm from "@/components/PaymentForm";

const Payment = () => {
  const { planId, cycle } = useLocalSearchParams<{
    planId: string;
    cycle: "monthly" | "yearly";
  }>();

  return (
    <View className="flex-1 gap-4 bg-background px-6 pt-16">
      <Text className="font-sans-bold text-2xl text-on-background">Payment Details</Text>
      <Text className="font-sans text-sm text-on-surface-variant">
        {planId} · {cycle}
      </Text>

      <PaymentForm planId={planId} cycle={cycle} />
    </View>
  );
};

export default Payment;
