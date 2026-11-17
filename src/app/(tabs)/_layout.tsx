
import { NativeTabs } from 'expo-router/native-tabs';

export default function TabLayout() {
    return (
        <NativeTabs>
            <NativeTabs.Trigger name="index">
                <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
                <NativeTabs.Trigger.Icon sf="house" />
            </NativeTabs.Trigger>

            <NativeTabs.Trigger name="plans">
                <NativeTabs.Trigger.Label>My Plans</NativeTabs.Trigger.Label>
                <NativeTabs.Trigger.Icon sf="list.bullet" />
            </NativeTabs.Trigger>

            <NativeTabs.Trigger name="planner">
                <NativeTabs.Trigger.Label>Planner</NativeTabs.Trigger.Label>
                <NativeTabs.Trigger.Icon sf="calendar" />
            </NativeTabs.Trigger>

            <NativeTabs.Trigger name="profile">
                <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
                <NativeTabs.Trigger.Icon sf="person.crop.circle" />
            </NativeTabs.Trigger>
        </NativeTabs>
    );
}
