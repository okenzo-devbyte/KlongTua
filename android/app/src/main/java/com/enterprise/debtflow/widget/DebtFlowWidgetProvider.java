package com.enterprise.debtflow.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
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
    public static final String EXTRA_TASK_ID = "extra_task_id";
    public static final String PREFS_NAME = "DebtFlowWidgetPrefs";
    public static final String KEY_SNAPSHOT = "debtflow_widget_snapshot_v1";
    public static final String KEY_PENDING_TOGGLES = "debtflow_pending_toggles_v1";

    private static final int[] ROW_IDS = {
        R.id.widget_task_row_1,
        R.id.widget_task_row_2,
        R.id.widget_task_row_3,
        R.id.widget_task_row_4,
    };
    private static final int[] CHECK_IDS = {
        R.id.tv_widget_task_check_1,
        R.id.tv_widget_task_check_2,
        R.id.tv_widget_task_check_3,
        R.id.tv_widget_task_check_4,
    };
    private static final int[] TITLE_IDS = {
        R.id.tv_widget_task_title_1,
        R.id.tv_widget_task_title_2,
        R.id.tv_widget_task_title_3,
        R.id.tv_widget_task_title_4,
    };
    private static final int[] SUBTITLE_IDS = {
        R.id.tv_widget_task_subtitle_1,
        R.id.tv_widget_task_subtitle_2,
        R.id.tv_widget_task_subtitle_3,
        R.id.tv_widget_task_subtitle_4,
    };
    private static final int[] AMOUNT_IDS = {
        R.id.tv_widget_task_amount_1,
        R.id.tv_widget_task_amount_2,
        R.id.tv_widget_task_amount_3,
        R.id.tv_widget_task_amount_4,
    };

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
        if (ACTION_TOGGLE_TASK_PAID.equals(intent.getAction())) {
            String taskId = intent.getStringExtra(EXTRA_TASK_ID);
            if (taskId != null) {
                applyTaskToggle(context, taskId);
                updateAllWidgets(context);
            }
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

        PendingIntent openAppIntent = createOpenAppIntent(context);
        views.setOnClickPendingIntent(R.id.widget_root, openAppIntent);
        views.setOnClickPendingIntent(R.id.tv_widget_title, openAppIntent);
        views.setOnClickPendingIntent(R.id.tv_widget_status, openAppIntent);
        views.setOnClickPendingIntent(R.id.tv_widget_remaining, openAppIntent);
        views.setOnClickPendingIntent(R.id.tv_widget_month, openAppIntent);
        views.setOnClickPendingIntent(R.id.tv_widget_empty, openAppIntent);

        if (snapshotJson == null || snapshotJson.trim().isEmpty() || "null".equals(snapshotJson.trim())) {
            renderEmptyState(
                views,
                "ยังไม่มีข้อมูลสัญญาเงินกู้\nแตะที่นี่เพื่อเปิดแอปและเริ่มบันทึกข้อมูล",
                "ยังไม่มีสัญญา",
                currentThaiMonthYear() + " • แตะเพื่อเริ่มต้นใช้งาน"
            );
            appWidgetManager.updateAppWidget(appWidgetId, views);
            return;
        }

        try {
            JSONObject snapshot = new JSONObject(snapshotJson);
            JSONArray tasks = snapshot.optJSONArray("tasks");
            int taskCount = tasks != null ? tasks.length() : 0;
            double remainingDue = snapshot.optDouble("totalRemainingDue", 0);
            double availableFunds = snapshot.optDouble("availableFunds", 0);
            double totalRemainingDebt = snapshot.optDouble("totalRemainingDebt", -1);
            double shortfall = snapshot.optDouble("shortfallAmount", 0);
            boolean isSufficient = snapshot.optBoolean("isSufficient", true);
            String yearMonth = snapshot.optString("yearMonth", "");
            if (yearMonth.isEmpty() || "null".equals(yearMonth)) {
                yearMonth = currentYearMonth();
            }

            int totalLoanCount = snapshot.optInt("totalLoanCount", -1);
            boolean hasLoans = snapshot.has("hasLoans")
                ? snapshot.optBoolean("hasLoans", false)
                : (totalLoanCount > 0 || taskCount > 0 || totalRemainingDebt > 0);
            if (totalLoanCount == 0) {
                hasLoans = false;
            } else if (totalLoanCount > 0) {
                hasLoans = true;
            }

            // If user has no loans at all
            if (!hasLoans && taskCount == 0 && (totalRemainingDebt <= 0 || totalRemainingDebt == -1)) {
                renderEmptyState(
                    views,
                    "ยังไม่มีข้อมูลสัญญาเงินกู้\nแตะที่นี่เพื่อเปิดแอปและเริ่มบันทึกข้อมูล",
                    "ยังไม่มีสัญญา",
                    formatThaiMonthYear(yearMonth) + " • แตะเพื่อเพิ่มสัญญา"
                );
                appWidgetManager.updateAppWidget(appWidgetId, views);
                return;
            }

            views.setTextViewText(R.id.tv_widget_title, "คล่องตัว");
            views.setTextViewText(R.id.tv_widget_remaining, "฿" + formatMoney(remainingDue));

            String subtext = formatThaiMonthYear(yearMonth);
            if (totalRemainingDebt >= 0) {
                subtext += " • หนี้คงเหลือรวม ฿" + formatMoney(totalRemainingDebt);
            } else {
                subtext += " • เงินต้นพร้อมใช้ ฿" + formatMoney(availableFunds);
            }
            views.setTextViewText(R.id.tv_widget_month, subtext);
            views.setTextColor(R.id.tv_widget_month, 0xFF94A3B8);

            if (remainingDue <= 0) {
                views.setTextViewText(R.id.tv_widget_status, "✓ ชำระครบแล้ว");
                views.setTextColor(R.id.tv_widget_status, 0xFF059669);
            } else if (isSufficient) {
                views.setTextViewText(R.id.tv_widget_status, "✓ เงินต้นพอจ่าย");
                views.setTextColor(R.id.tv_widget_status, 0xFF059669);
            } else {
                views.setTextViewText(R.id.tv_widget_status, "⚠ ต้องหาเพิ่ม ฿" + formatMoney(shortfall));
                views.setTextColor(R.id.tv_widget_status, 0xFFE11D48);
            }

            JSONArray orderedTasks = new JSONArray();
            if (tasks != null) {
                for (int i = 0; i < tasks.length(); i++) {
                    JSONObject task = tasks.optJSONObject(i);
                    if (task != null && !task.optBoolean("isPaid", false)) {
                        orderedTasks.put(task);
                    }
                }
                for (int i = 0; i < tasks.length(); i++) {
                    JSONObject task = tasks.optJSONObject(i);
                    if (task != null && task.optBoolean("isPaid", false)) {
                        orderedTasks.put(task);
                    }
                }
            }

            if (orderedTasks.length() == 0) {
                views.setTextViewText(R.id.tv_widget_empty, "ไม่มีรายการค้างชำระในเดือนนี้ 🎉");
                views.setTextColor(R.id.tv_widget_empty, 0xFF059669);
                views.setViewVisibility(R.id.tv_widget_empty, View.VISIBLE);
                for (int rowId : ROW_IDS) {
                    views.setViewVisibility(rowId, View.GONE);
                }
            } else {
                views.setViewVisibility(R.id.tv_widget_empty, View.GONE);

                Bundle options = appWidgetManager.getAppWidgetOptions(appWidgetId);
                int minHeight = options != null ? options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 0) : 0;
                int maxRows = ROW_IDS.length;
                if (minHeight > 0 && minHeight < 140) {
                    maxRows = 2;
                } else if (minHeight >= 140 && minHeight < 200) {
                    maxRows = 3;
                }

                for (int i = 0; i < ROW_IDS.length; i++) {
                    if (i < maxRows) {
                        bindTaskRow(views, context, appWidgetId, orderedTasks.optJSONObject(i), i);
                    } else {
                        views.setViewVisibility(ROW_IDS[i], View.GONE);
                    }
                }
            }
        } catch (JSONException exception) {
            renderEmptyState(
                views,
                "เกิดข้อผิดพลาดในการโหลดข้อมูล\nแตะที่นี่เพื่อเปิดแอปและซิงก์ใหม่",
                "ซิงก์ข้อมูล",
                currentThaiMonthYear() + " • แตะเพื่อเปิดแอป"
            );
        }

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    private static void bindTaskRow(
        RemoteViews views,
        Context context,
        int appWidgetId,
        JSONObject task,
        int index
    ) {
        int rowId = ROW_IDS[index];

        if (task == null) {
            views.setViewVisibility(rowId, View.GONE);
            return;
        }

        String taskId = task.optString("id", "");
        String loanTitle = task.optString("loanTitle", "");
        String subTitle = task.optString("subTitle", "");
        String dueDate = formatThaiDayMonth(task.optString("dueDateFormatted", task.optString("dueDate", "")));
        boolean isPaid = task.optBoolean("isPaid", false);
        boolean isOverdue = task.optBoolean("isOverdue", false);
        double amount = task.optDouble("amount", 0);

        views.setViewVisibility(rowId, View.VISIBLE);
        views.setTextViewText(CHECK_IDS[index], isPaid ? "✓" : "○");
        views.setTextColor(CHECK_IDS[index], isPaid ? 0xFF059669 : 0xFF94A3B8);
        views.setTextViewText(TITLE_IDS[index], loanTitle.isEmpty() ? "รายการชำระ" : loanTitle);
        views.setTextColor(TITLE_IDS[index], isPaid ? 0xFF94A3B8 : 0xFF0F172A);

        String statusSuffix = isPaid ? " • ชำระแล้ว" : (isOverdue ? " • เลยกำหนด" : "");
        StringBuilder subtextBuilder = new StringBuilder();
        if (!subTitle.isEmpty()) {
            subtextBuilder.append(subTitle);
        }
        if (!dueDate.isEmpty()) {
            if (subtextBuilder.length() > 0) subtextBuilder.append(" • ");
            subtextBuilder.append(dueDate);
        }
        if (!statusSuffix.isEmpty()) {
            subtextBuilder.append(statusSuffix);
        }
        views.setTextViewText(SUBTITLE_IDS[index], subtextBuilder.toString());
        if (isPaid) {
            views.setTextColor(SUBTITLE_IDS[index], 0xFF94A3B8);
        } else if (isOverdue) {
            views.setTextColor(SUBTITLE_IDS[index], 0xFFE11D48);
        } else {
            views.setTextColor(SUBTITLE_IDS[index], 0xFF64748B);
        }
        views.setTextViewText(AMOUNT_IDS[index], "฿" + formatMoney(amount));
        views.setTextColor(AMOUNT_IDS[index], isPaid ? 0xFF94A3B8 : 0xFF0F172A);

        Intent toggleIntent = new Intent(context, DebtFlowWidgetProvider.class);
        toggleIntent.setAction(ACTION_TOGGLE_TASK_PAID);
        toggleIntent.putExtra(EXTRA_TASK_ID, taskId);
        toggleIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        toggleIntent.setData(Uri.parse("debtflow://widget/" + appWidgetId + "/" + taskId));

        int requestCode = ((appWidgetId * 31) + taskId.hashCode()) & 0x7FFFFFFF;
        PendingIntent togglePendingIntent = PendingIntent.getBroadcast(
            context,
            requestCode,
            toggleIntent,
            pendingIntentFlags()
        );
        views.setOnClickPendingIntent(rowId, togglePendingIntent);
        views.setOnClickPendingIntent(CHECK_IDS[index], togglePendingIntent);
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

    private static void renderEmptyState(
        RemoteViews views,
        String emptyMessage,
        String statusBadgeText,
        String subtext
    ) {
        views.setTextViewText(R.id.tv_widget_title, "คล่องตัว");
        views.setTextViewText(R.id.tv_widget_remaining, "฿0");
        views.setTextViewText(R.id.tv_widget_status, statusBadgeText);
        views.setTextColor(R.id.tv_widget_status, 0xFF64748B);
        views.setTextViewText(R.id.tv_widget_month, subtext);
        views.setTextColor(R.id.tv_widget_month, 0xFF94A3B8);
        views.setTextViewText(R.id.tv_widget_empty, emptyMessage);
        views.setTextColor(R.id.tv_widget_empty, 0xFF475569);
        views.setViewVisibility(R.id.tv_widget_empty, View.VISIBLE);
        for (int rowId : ROW_IDS) {
            views.setViewVisibility(rowId, View.GONE);
        }
    }

    private static String currentYearMonth() {
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM", Locale.US);
        return sdf.format(new Date());
    }

    private static String currentThaiMonthYear() {
        return formatThaiMonthYear(currentYearMonth());
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
        return PendingIntent.getActivity(context, 2001, launchIntent, pendingIntentFlags());
    }

    private static int pendingIntentFlags() {
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        return flags;
    }

    private static String formatMoney(double amount) {
        if (Double.isNaN(amount) || Double.isInfinite(amount)) {
            return "0";
        }
        double positive = Math.max(0, amount);
        return String.format(Locale.US, "%,.0f", positive);
    }

    private static String formatThaiMonthYear(String yearMonth) {
        if (yearMonth == null || yearMonth.isEmpty() || "null".equals(yearMonth)) {
            yearMonth = currentYearMonth();
        }
        String[] parts = yearMonth.split("-");
        if (parts.length < 2) return currentThaiMonthYear();

        try {
            int year = Integer.parseInt(parts[0]);
            int month = Integer.parseInt(parts[1]);
            if (month < 1 || month > 12) return currentThaiMonthYear();
            return THAI_SHORT_MONTHS[month - 1] + " " + (year + 543);
        } catch (NumberFormatException exception) {
            return currentThaiMonthYear();
        }
    }

    private static String formatThaiDayMonth(String dateStr) {
        if (dateStr == null || dateStr.isEmpty() || "null".equals(dateStr)) return "";
        String[] parts = dateStr.split("-");
        if (parts.length < 3) return dateStr;

        try {
            int month = Integer.parseInt(parts[1]);
            String dayStr = parts[2];
            if (dayStr.contains("T")) {
                dayStr = dayStr.substring(0, dayStr.indexOf('T'));
            } else if (dayStr.contains(" ")) {
                dayStr = dayStr.substring(0, dayStr.indexOf(' '));
            }
            int day = Integer.parseInt(dayStr.trim());
            if (month < 1 || month > 12) return dateStr;
            return day + " " + THAI_SHORT_MONTHS[month - 1];
        } catch (NumberFormatException exception) {
            return dateStr;
        }
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