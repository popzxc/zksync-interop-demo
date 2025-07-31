import { ref } from "vue";

const helpEnabled = ref(true);

export default function useHelpState() {
    const toggleHelp = () => {
        helpEnabled.value = !helpEnabled.value;
    };

    return {
        helpEnabled,
        toggleHelp
    };
}
