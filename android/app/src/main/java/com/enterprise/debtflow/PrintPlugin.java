package com.enterprise.debtflow;

import android.content.Context;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "Print")
public class PrintPlugin extends Plugin {

    @PluginMethod
    public void print(PluginCall call) {
        String jobName = call.getString("jobName", "DebtFlow Report");

        getActivity().runOnUiThread(() -> {
            try {
                PrintManager manager = (PrintManager) getContext()
                    .getSystemService(Context.PRINT_SERVICE);
                PrintDocumentAdapter adapter = getBridge()
                    .getWebView()
                    .createPrintDocumentAdapter(jobName);

                manager.print(jobName, adapter, new PrintAttributes.Builder().build());

                JSObject response = new JSObject();
                response.put("started", true);
                call.resolve(response);
            } catch (RuntimeException exception) {
                call.reject("Unable to start print job", exception);
            }
        });
    }
}
