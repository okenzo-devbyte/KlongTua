package com.enterprise.debtflow;

import android.graphics.Color;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "SystemBars")
public class SystemBarsPlugin extends Plugin {

    @PluginMethod
    public void setNavigationBar(PluginCall call) {
        String color = call.getString("color", "#000000");
        boolean lightIcons = Boolean.TRUE.equals(call.getBoolean("lightIcons", false));

        getActivity().runOnUiThread(() -> {
            try {
                getActivity().getWindow().setNavigationBarColor(Color.parseColor(color));
                WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(
                    getActivity().getWindow(),
                    getActivity().getWindow().getDecorView()
                );
                controller.setAppearanceLightNavigationBars(lightIcons);
                call.resolve(new JSObject());
            } catch (IllegalArgumentException exception) {
                call.reject("Invalid navigation bar color", exception);
            }
        });
    }
}
