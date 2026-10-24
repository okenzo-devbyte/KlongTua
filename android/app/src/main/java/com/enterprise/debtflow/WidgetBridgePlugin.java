package com.enterprise.debtflow;

import android.content.Context;
import android.content.SharedPreferences;

import com.enterprise.debtflow.widget.DebtFlowWidgetProvider;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridgePlugin extends Plugin {

    @PluginMethod
    public void updateSnapshot(PluginCall call) {
        String snapshot = call.getString("snapshot");
        if (snapshot == null) {
            call.reject("snapshot is required");
            return;
        }

        prefs().edit()
            .putString(DebtFlowWidgetProvider.KEY_SNAPSHOT, snapshot)
            .apply();
        DebtFlowWidgetProvider.updateAllWidgets(getContext());
        call.resolve();
    }

    @PluginMethod
    public void consumePendingToggles(PluginCall call) {
        SharedPreferences prefs = prefs();
        JSArray toggles = new JSArray();

        try {
            JSONArray pending = new JSONArray(
                prefs.getString(DebtFlowWidgetProvider.KEY_PENDING_TOGGLES, "[]")
            );
            for (int i = 0; i < pending.length(); i++) {
                JSONObject item = pending.optJSONObject(i);
                if (item == null) continue;

                JSObject toggle = new JSObject();
                toggle.put("taskId", item.optString("taskId", ""));
                toggle.put("isPaid", item.optBoolean("isPaid", false));
                toggles.put(toggle);
            }
        } catch (JSONException ignored) {
        }

        prefs.edit().remove(DebtFlowWidgetProvider.KEY_PENDING_TOGGLES).apply();

        JSObject result = new JSObject();
        result.put("toggles", toggles);
        call.resolve(result);
    }

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences(
            DebtFlowWidgetProvider.PREFS_NAME,
            Context.MODE_PRIVATE
        );
    }
}
