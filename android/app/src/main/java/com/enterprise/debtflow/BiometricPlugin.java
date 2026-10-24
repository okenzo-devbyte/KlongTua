package com.enterprise.debtflow;

import androidx.annotation.NonNull;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.concurrent.Executor;

@CapacitorPlugin(name = "Biometric")
public class BiometricPlugin extends Plugin {

    private boolean isAuthenticating = false;

    @PluginMethod
    public void isAvailable(PluginCall call) {
        int result = BiometricManager.from(getContext())
            .canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG);

        JSObject response = new JSObject();
        response.put("available", result == BiometricManager.BIOMETRIC_SUCCESS);
        response.put("reason", reasonFor(result));
        call.resolve(response);
    }

    @PluginMethod
    public void authenticate(PluginCall call) {
        if (isAuthenticating) {
            resolveSuccess(call, false);
            return;
        }

        if (!(getActivity() instanceof FragmentActivity)) {
            resolveSuccess(call, false);
            return;
        }

        FragmentActivity activity = (FragmentActivity) getActivity();
        String title = call.getString("title", "ปลดล็อก DebtFlow");
        String subtitle = call.getString("subtitle", "สแกนลายนิ้วมือหรือใบหน้าเพื่อเข้าใช้งาน");
        String cancelTitle = call.getString("cancelTitle", "ใช้รหัส PIN");

        Executor executor = ContextCompat.getMainExecutor(getContext());
        BiometricPrompt prompt = new BiometricPrompt(
            activity,
            executor,
            new BiometricPrompt.AuthenticationCallback() {
                @Override
                public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult result) {
                    isAuthenticating = false;
                    resolveSuccess(call, true);
                }

                @Override
                public void onAuthenticationError(int errorCode, @NonNull CharSequence errString) {
                    isAuthenticating = false;
                    resolveSuccess(call, false);
                }

                @Override
                public void onAuthenticationFailed() {
                    // Keep the prompt open so the user can retry.
                }
            }
        );

        BiometricPrompt.PromptInfo promptInfo = new BiometricPrompt.PromptInfo.Builder()
            .setTitle(title)
            .setSubtitle(subtitle)
            .setNegativeButtonText(cancelTitle)
            .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_STRONG)
            .build();

        isAuthenticating = true;
        activity.runOnUiThread(() -> prompt.authenticate(promptInfo));
    }

    private void resolveSuccess(PluginCall call, boolean success) {
        JSObject response = new JSObject();
        response.put("success", success);
        call.resolve(response);
    }

    private String reasonFor(int result) {
        switch (result) {
            case BiometricManager.BIOMETRIC_SUCCESS:
                return "SUCCESS";
            case BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE:
                return "NO_HARDWARE";
            case BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE:
                return "HW_UNAVAILABLE";
            case BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED:
                return "NONE_ENROLLED";
            default:
                return "ERROR";
        }
    }
}
