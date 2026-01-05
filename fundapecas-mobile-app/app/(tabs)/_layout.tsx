import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TabsLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: "#2563eb",
                tabBarInactiveTintColor: "#94a3b8",
                tabBarStyle: {
                    backgroundColor: "white",
                    borderTopWidth: 0.3,
                    height: 58,
                    paddingBottom: 5,
                },
            }}
        >
            <Tabs.Screen
                name="home"
                options={{
                    title: "Home",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="home-outline" color={color} size={size} />
                    ),
                }}
            />
            <Tabs.Screen
                name="parts"
                options={{
                    title: "Peças",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="cube-outline" color={color} size={size} />
                    ),
                }}
            />
            <Tabs.Screen
                name="orders"
                options={{
                    title: "Pedidos",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="clipboard-outline" color={color} size={size} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    href: null,
                }}
            />
            <Tabs.Screen
                name="Parts/[id]"
                options={{
                    href: null,
                }}
            />
            <Tabs.Screen
                name="Parts/createPart"
                options={{
                    href: null,
                }}
            />
            <Tabs.Screen
                name="Orders/createOrder"
                options={{
                    href: null,
                }}
            />
            <Tabs.Screen
                name="Parts/movementPart"
                options={{
                    href: null,
                }}
            />
        </Tabs>
    );
}