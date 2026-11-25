package com.enterprise.debtflow.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.widget.RemoteViews;

import com.enterprise.debtflow.MainActivity;
import com.enterprise.debtflow.R;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

public class DebtFlowWidgetProvider extends AppWidgetProvider {

    public static final String ACTION_TOGGLE_TASK_PAID = "com.enterprise.debtflow.ACTION_TOGGLE_TASK_PAID";
    public static final String ACTION_TOGGLE_FILTER = "com.enterprise.debtflow.ACTION_TOGGLE_FILTER";
    public static final String EXTRA_TASK_ID = "extra_task_id";
    public static final String PREFS_NAME = "DebtFlowWidgetPrefs";
    public static final String KEY_SNAPSHOT = "debtflow_widget_snapshot_v1";
    public static final String KEY_PENDING_TOGGLES = "debtflow_pending_toggles_v1";
    public static final String KEY_FILTER_UNPAID_ONLY = "debtflow_widget_filter_unpaid_only";

    private static final String[] THAI_SHORT_MONTHS = {
        "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
        "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
    };

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    @Override
    public void onEnabled(Context context) {
        super.onEnabled(context);
        updateAllWidgets(context);
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager appWidgetManager, int appWidgetId, Bundle newOptions) {
        super.onAppWidgetOptionsChanged(context, appWidgetManager, appWidgetId, newOptions);
        updateAppWidget(context, appWidgetManager, appWidgetId);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (ACTION_TOGGLE_TASK_PAID.equals(action)) {
            String taskId = intent.getStringExtra(EXTRA_TASK_ID);
            if (taskId != null && !taskId.isEmpty()) {
                applyTaskToggle(context, taskId);
                updateAllWidgets(context);
            }
            return;
        }

        if (ACTION_TOGGLE_FILTER.equals(action)) {
            SharedPreferences prefs = prefs(context);
            boolean current = prefs.getBoolean(KEY_FILTER_UNPAID_ONLY, false);
            prefs.edit().putBoolean(KEY_FILTER_UNPAID_ONLY, !current).apply();
            updateAllWidgets(context);
            return;
        }

        if (Intent.ACTION_DATE_CHANGED.equals(action) || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {
            updateAllWidgets(context);
            return;
        }

        super.onReceive(context, intent);
    }

    public static void updateAllWidgets(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        ComponentName componentName = new ComponentName(context, DebtFlowWidgetProvider.class);
        int[] widgetIds = manager.getAppWidgetIds(componentName);
        if (widgetIds != null && widgetIds.length > 0) {
            for (int widgetId : widgetIds) {
                updateAppWidget(context, manager, widgetId);
            }
        }
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_debtflow);
        SharedPreferences prefs = prefs(context);
        String snapshotJson = prefs.getString(KEY_SNAPSHOT, null);
        boolean filterUnpaidOnly = prefs.getBoolean(KEY_FILTER_UNPAID_ONLY, false);

        PendingIntent openAppIntent = createOpenAppIntent(context);
        views.setOnClickPendingIntent(R.id.widget_root, openAppIntent);
        views.setOnClickPendingIntent(R.id.tv_widget_title, openAppIntent);
        views.setOnClickPendingIntent(R.id.tv_widget_summary, openAppIntent);
        views.setOnClickPendingIntent(R.id.tv_widget_empty, openAppIntent);

        Intent filterIntent = new Intent(context, DebtFlowWidgetProvider.class);
        filterIntent.setAction(ACTION_TOGGLE_FILTER);
        PendingIntent filterPendingIntent = PendingIntent.getBroadcast(
            context,
            3001 + appWidgetId,
            filterIntent,
            immutablePendingIntentFlags()
        );
        views.setOnClickPendingIntent(R.id.tv_widget_filter_btn, filterPendingIntent);
        views.setTextViewText(R.id.tv_widget_filter_btn, filterUnpaidOnly ? "▴" : "▾");

        // Default NotePlus Burgundy Styling
        int headerColor = 0xFF7F1D1D;
        int bgColor = Color.BLACK;
        int bgOpacity = 92;
        int textColor = Color.WHITE;
        String customTitle = "รายจ่ายแต่ละเดือน";
        boolean showHeaderSummary = false;
        boolean hideAmounts = false;
        boolean privacyMode = false;
        double remainingDue = 0;
        boolean hasLoans = false;
        int taskCount = 0;
        double totalRemainingDebt = -1;

        if (snapshotJson != null && !snapshotJson.trim().isEmpty() && !"null".equals(snapshotJson.trim())) {
            try {
                JSONObject snapshot = new JSONObject(snapshotJson);
                JSONArray tasks = snapshot.optJSONArray("tasks");
                taskCount = tasks != null ? tasks.length() : 0;
                remainingDue = snapshot.optDouble("totalRemainingDue", 0);
                totalRemainingDebt = snapshot.optDouble("totalRemainingDebt", -1);
                privacyMode = snapshot.optBoolean("privacyMode", false);

                int totalLoanCount = snapshot.optInt("totalLoanCount", -1);
                hasLoans = snapshot.has("hasLoans")
                    ? snapshot.optBoolean("hasLoans", false)
                    : (totalLoanCount > 0 || taskCount > 0 || totalRemainingDebt > 0);
                if (totalLoanCount == 0) hasLoans = false;
                else if (totalLoanCount > 0) hasLoans = true;

                JSONObject config = snapshot.optJSONObject("config");
                if (config != null) {
                    String titleFromCfg = config.optString("customTitle", "");
                    if (!titleFromCfg.trim().isEmpty()) {
                        customTitle = titleFromCfg.trim();
                    }
                    headerColor = parseColorSafe(config.optString("headerColor", "#7F1D1D"), 0xFF7F1D1D);
                    bgColor = parseColorSafe(config.optString("backgroundColor", "#000000"), Color.BLACK);
                    bgOpacity = Math.min(100, Math.max(15, config.optInt("backgroundOpacity", 92)));
                    textColor = parseColorSafe(config.optString("textColor", "#FFFFFF"), Color.WHITE);
                    showHeaderSummary = config.optBoolean("showHeaderSummary", false);
                    hideAmounts = config.optBoolean("hideAmounts", false);
                }
            } catch (JSONException ignored) {
            }
        }

        // Apply dynamic header, background color, and opacity
        views.setInt(R.id.widget_header_bg, "setColorFilter", headerColor);
        views.setInt(R.id.widget_bg_image, "setColorFilter", bgColor);
        views.setInt(R.id.widget_bg_image, "setImageAlpha", Math.round((bgOpacity / 100f) * 255f));
        views.setTextViewText(R.id.tv_widget_title, customTitle);
        views.setTextColor(R.id.tv_widget_empty, textColor);

        if (showHeaderSummary && !hideAmounts && !privacyMode && hasLoans) {
            views.setTextViewText(R.id.tv_widget_summary, "฿" + formatMoney(remainingDue));
            views.setViewVisibility(R.id.tv_widget_summary, View.VISIBLE);
        } else {
            views.setViewVisibility(R.id.tv_widget_summary, View.GONE);
        }

        if (!hasLoans && taskCount == 0) {
            views.setTextViewText(
                R.id.tv_widget_empty,
                "ยังไม่มีสัญญา\nแตะที่นี่เพื่อเปิดแอปและเพิ่มรายการ"
            );
        } else {
            views.setTextViewText(
                R.id.tv_widget_empty,
                "✓ ชำระครบทุกรายการแล้ว 🎉"
            );
        }

        // Bind Scrollable RemoteViewsService ListView
        Intent serviceIntent = new Intent(context, DebtFlowWidgetService.class);
        serviceIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        serviceIntent.setData(Uri.parse("debtflow://widget_service/" + appWidgetId + "/" + System.currentTimeMillis()));
        views.setRemoteAdapter(R.id.widget_task_list, serviceIntent);
        views.setEmptyView(R.id.widget_task_list, R.id.tv_widget_empty);

        // Template PendingIntent for 1-Tap row toggle
        Intent toggleTemplateIntent = new Intent(context, DebtFlowWidgetProvider.class);
        toggleTemplateIntent.setAction(ACTION_TOGGLE_TASK_PAID);
        toggleTemplateIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        PendingIntent toggleTemplatePendingIntent = PendingIntent.getBroadcast(
            context,
            4001 + appWidgetId,
            toggleTemplateIntent,
            mutablePendingIntentFlags()
        );
        views.setPendingIntentTemplate(R.id.widget_task_list, toggleTemplatePendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
        appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetId, R.id.widget_task_list);
    }

    private static void applyTaskToggle(Context context, String taskId) {
        SharedPreferences prefs = prefs(context);
        String snapshotJson = prefs.getString(KEY_SNAPSHOT, null);
        if (snapshotJson == null) return;

        try {
            JSONObject snapshot = new JSONObject(snapshotJson);
            JSONArray tasks = snapshot.optJSONArray("tasks");
            if (tasks == null) return;

            JSONObject target = null;
            for (int i = 0; i < tasks.length(); i++) {
                JSONObject task = tasks.optJSONObject(i);
                if (task != null && taskId.equals(task.optString("id", ""))) {
                    target = task;
                    break;
                }
            }
            if (target == null) return;

            double taskAmount = target.optDouble("amount", 0);
            boolean desiredPaid = !target.optBoolean("isPaid", false);
            target.put("isPaid", desiredPaid);
            if (desiredPaid) {
                if (target.optBoolean("isOverdue", false) || isTaskOverdue(target)) {
                    target.put("wasOverdue", true);
                }
                target.put("isOverdue", false);
            } else {
                boolean overdue = isTaskOverdue(target);
                target.put("isOverdue", overdue);
                target.remove("wasOverdue");
            }

            double totalRemaining = 0;
            for (int i = 0; i < tasks.length(); i++) {
                JSONObject task = tasks.optJSONObject(i);
                if (task != null && !task.optBoolean("isPaid", false)) {
                    totalRemaining += task.optDouble("amount", 0);
                }
            }

            double availableFunds = snapshot.optDouble("availableFunds", 0);
            double totalRemainingDebt = snapshot.optDouble("totalRemainingDebt", -1);
            double totalPrincipalDebt = snapshot.optDouble("totalPrincipalDebt", -1);

            if (desiredPaid) {
                double deductFunds = Math.min(Math.max(0, availableFunds), taskAmount);
                target.put("deductedFunds", deductFunds);
                availableFunds = Math.max(0, availableFunds - deductFunds);

                if (totalRemainingDebt >= 0) {
                    double deductPrincipal = Math.min(totalRemainingDebt, taskAmount);
                    target.put("deductedPrincipal", deductPrincipal);
                    totalRemainingDebt = Math.max(0, totalRemainingDebt - deductPrincipal);
                }
            } else {
                double refundFunds = target.has("deductedFunds")
                    ? target.optDouble("deductedFunds", taskAmount)
                    : taskAmount;
                availableFunds += refundFunds;
                target.remove("deductedFunds");

                if (totalRemainingDebt >= 0) {
                    double refundPrincipal = target.has("deductedPrincipal")
                        ? target.optDouble("deductedPrincipal", taskAmount)
                        : taskAmount;
                    totalRemainingDebt += refundPrincipal;
                    if (totalPrincipalDebt >= 0 && totalRemainingDebt > totalPrincipalDebt) {
                        totalRemainingDebt = totalPrincipalDebt;
                    }
                    target.remove("deductedPrincipal");
                }
            }

            boolean isSufficient = availableFunds >= totalRemaining;
            snapshot.put("totalRemainingDue", totalRemaining);
            snapshot.put("availableFunds", availableFunds);
            if (totalRemainingDebt >= 0) {
                snapshot.put("totalRemainingDebt", totalRemainingDebt);
            }
            snapshot.put("isSufficient", isSufficient);
            snapshot.put("shortfallAmount", isSufficient ? 0 : totalRemaining - availableFunds);
            snapshot.put("updatedAt", nowIso());

            JSONArray pendingToggles;
            try {
                pendingToggles = new JSONArray(prefs.getString(KEY_PENDING_TOGGLES, "[]"));
            } catch (JSONException exception) {
                pendingToggles = new JSONArray();
            }

            boolean found = false;
            for (int i = 0; i < pendingToggles.length(); i++) {
                JSONObject item = pendingToggles.optJSONObject(i);
                if (item != null && taskId.equals(item.optString("taskId", ""))) {
                    item.put("isPaid", desiredPaid);
                    found = true;
                    break;
                }
            }
            if (!found) {
                JSONObject pendingToggle = new JSONObject();
                pendingToggle.put("taskId", taskId);
                pendingToggle.put("isPaid", desiredPaid);
                pendingToggles.put(pendingToggle);
            }

            boolean ok = prefs.edit()
                .putString(KEY_SNAPSHOT, snapshot.toString())
                .putString(KEY_PENDING_TOGGLES, pendingToggles.toString())
                .commit();
            if (!ok) {
                prefs.edit()
                    .putString(KEY_SNAPSHOT, snapshot.toString())
                    .putString(KEY_PENDING_TOGGLES, pendingToggles.toString())
                    .apply();
            }
        } catch (JSONException ignored) {
        }
    }

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    public static String reapplyPendingToggles(String snapshotJson, JSONArray pendingToggles) {
        if (snapshotJson == null || pendingToggles == null || pendingToggles.length() == 0) {
            return snapshotJson;
        }
        try {
            JSONObject snapshot = new JSONObject(snapshotJson);
            JSONArray tasks = snapshot.optJSONArray("tasks");
            if (tasks == null) return snapshotJson;

            double availableFunds = snapshot.optDouble("availableFunds", 0);
            double totalRemainingDebt = snapshot.optDouble("totalRemainingDebt", -1);
            double totalPrincipalDebt = snapshot.optDouble("totalPrincipalDebt", -1);

            for (int p = 0; p < pendingToggles.length(); p++) {
                JSONObject pt = pendingToggles.optJSONObject(p);
                if (pt == null) continue;
                String taskId = pt.optString("taskId", "");
                boolean desiredPaid = pt.optBoolean("isPaid", false);

                for (int t = 0; t < tasks.length(); t++) {
                    JSONObject task = tasks.optJSONObject(t);
                    if (task != null && taskId.equals(task.optString("id", ""))) {
                        boolean currentPaid = task.optBoolean("isPaid", false);
                        if (currentPaid != desiredPaid) {
                            double amount = task.optDouble("amount", 0);
                            task.put("isPaid", desiredPaid);
                            if (desiredPaid) {
                                if (task.optBoolean("isOverdue", false) || isTaskOverdue(task)) {
                                    task.put("wasOverdue", true);
                                }
                                task.put("isOverdue", false);
                                double deductFunds = Math.min(Math.max(0, availableFunds), amount);
                                task.put("deductedFunds", deductFunds);
                                availableFunds = Math.max(0, availableFunds - deductFunds);
                                if (totalRemainingDebt >= 0) {
                                    double deductPrincipal = Math.min(totalRemainingDebt, amount);
                                    task.put("deductedPrincipal", deductPrincipal);
                                    totalRemainingDebt = Math.max(0, totalRemainingDebt - deductPrincipal);
                                }
                            } else {
                                boolean overdue = isTaskOverdue(task);
                                task.put("isOverdue", overdue);
                                task.remove("wasOverdue");
                                double refundFunds = task.has("deductedFunds")
                                    ? task.optDouble("deductedFunds", amount)
                                    : amount;
                                availableFunds += refundFunds;
                                task.remove("deductedFunds");
                                if (totalRemainingDebt >= 0) {
                                    double refundPrincipal = task.has("deductedPrincipal")
                                        ? task.optDouble("deductedPrincipal", amount)
                                        : amount;
                                    totalRemainingDebt += refundPrincipal;
                                    if (totalPrincipalDebt >= 0 && totalRemainingDebt > totalPrincipalDebt) {
                                        totalRemainingDebt = totalPrincipalDebt;
                                    }
                                    task.remove("deductedPrincipal");
                                }
                            }
                        }
                        break;
                    }
                }
            }

            double totalRemaining = 0;
            for (int i = 0; i < tasks.length(); i++) {
                JSONObject task = tasks.optJSONObject(i);
                if (task != null && !task.optBoolean("isPaid", false)) {
                    totalRemaining += task.optDouble("amount", 0);
                }
            }

            boolean isSufficient = availableFunds >= totalRemaining;
            snapshot.put("totalRemainingDue", totalRemaining);
            snapshot.put("availableFunds", availableFunds);
            if (totalRemainingDebt >= 0) {
                snapshot.put("totalRemainingDebt", totalRemainingDebt);
            }
            snapshot.put("isSufficient", isSufficient);
            snapshot.put("shortfallAmount", isSufficient ? 0 : totalRemaining - availableFunds);

            return snapshot.toString();
        } catch (JSONException e) {
            return snapshotJson;
        }
    }

    private static PendingIntent createOpenAppIntent(Context context) {
        Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launchIntent == null) {
            launchIntent = new Intent(context, MainActivity.class);
        }
        launchIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED);
        return PendingIntent.getActivity(context, 2001, launchIntent, immutablePendingIntentFlags());
    }

    private static int immutablePendingIntentFlags() {
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        return flags;
    }

    private static int mutablePendingIntentFlags() {
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            flags |= PendingIntent.FLAG_MUTABLE;
        }
        return flags;
    }

    private static int parseColorSafe(String hex, int fallback) {
        if (hex == null || hex.trim().isEmpty()) return fallback;
        try {
            return Color.parseColor(hex.trim());
        } catch (Exception ignored) {
            return fallback;
        }
    }

    private static String formatMoney(double amount) {
        if (Double.isNaN(amount) || Double.isInfinite(amount)) {
            return "0";
        }
        double positive = Math.max(0, amount);
        return String.format(Locale.US, "%,.0f", positive);
    }

    public static boolean isTaskOverdue(JSONObject task) {
        if (task == null) return false;
        if (task.optBoolean("wasOverdue", false)) return true;
        String dateStr = task.optString("dueDateFormatted", task.optString("dueDate", ""));
        if (dateStr == null || dateStr.trim().isEmpty() || "null".equals(dateStr.trim())) return false;
        String cleanDate = dateStr.trim();
        if (cleanDate.contains("T")) {
            cleanDate = cleanDate.substring(0, cleanDate.indexOf('T'));
        } else if (cleanDate.contains(" ")) {
            cleanDate = cleanDate.substring(0, cleanDate.indexOf(' '));
        }
        String[] parts = cleanDate.split("-");
        if (parts.length != 3) {
            return task.optBoolean("wasOverdue", false);
        }
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
        String todayStr = sdf.format(new Date());
        return cleanDate.compareTo(todayStr) < 0;
    }

    private static String nowIso() {
        SimpleDateFormat formatter = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
        formatter.setTimeZone(TimeZone.getTimeZone("UTC"));
        return formatter.format(new Date());
    }
}
