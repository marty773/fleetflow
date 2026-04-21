import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CONNECTOR_ID = "69e7e9011ba9f171bc4e576e";

const FLEET_FILES = {
  entities: [
    "Vehicle",
    "MaintenanceRecord",
    "MaintenanceInterval",
    "Item",
    "Bill",
    "Vendor",
    "CalendarAppointment",
    "ServiceType",
    "CompanyNotificationSettings",
    "UserCompanyAccess",
    "UserCalendarAuth",
    "CompanyCalendarAuth",
  ],
  pages: [
    "Vehicles",
    "Bills",
    "Calendar",
    "Maintenance",
    "Items",
    "Reports",
    "Vendors",
    "Settings",
    "Dashboard",
    "VehicleForm",
    "VendorFormPage",
    "ItemFormPage",
    "BillFormPage",
    "MaintenanceRecordFormPage",
    "MaintenanceIntervalFormPage",
    "SystemUpdates",
  ],
  components: [
    "components/vehicles/VehicleCard.jsx",
    "components/vehicles/VehicleForm.jsx",
    "components/vehicles/VehicleViewDialog.jsx",
    "components/vehicles/FleetMap.jsx",
    "components/vehicles/FleetLivePreview.jsx",
    "components/vehicles/FleetLiveSection.jsx",
    "components/vehicles/MotiveLivePanel.jsx",
    "components/bills/BillForm.jsx",
    "components/bills/BillList.jsx",
    "components/bills/BillGallery.jsx",
    "components/bills/CreateMaintenanceFromBillDialog.jsx",
    "components/maintenance/MaintenanceForm.jsx",
    "components/maintenance/MaintenanceList.jsx",
    "components/maintenance/IntervalForm.jsx",
    "components/maintenance/IntervalList.jsx",
    "components/maintenance/MarkCompleteDialog.jsx",
    "components/maintenance/AIIntervalGenerator.jsx",
    "components/dialogs/BillDetailDialog.jsx",
    "components/dialogs/MaintenanceRecordDetailDialog.jsx",
    "components/dialogs/IntervalDetailDialog.jsx",
    "components/dialogs/ItemDetailDialog.jsx",
    "components/items/ItemCard.jsx",
    "components/items/ItemForm.jsx",
    "components/items/ItemFormDialog.jsx",
    "components/vendors/VendorCard.jsx",
    "components/vendors/VendorForm.jsx",
    "components/reports/PartsNeededReport.jsx",
    "components/reports/VehicleCostChart.jsx",
    "components/reports/VehicleCostReport.jsx",
    "components/reports/InventoryReport.jsx",
    "components/reports/VendorReport.jsx",
    "components/calendar/AppointmentForm.jsx",
    "components/calendar/SyncDialog.jsx",
    "components/dashboard/DashboardStats.jsx",
    "components/dashboard/DashboardServiceList.jsx",
    "components/dashboard/UpcomingMaintenance.jsx",
    "components/dashboard/RecentExpenses.jsx",
    "components/settings/ServiceReminderSettings.jsx",
    "components/settings/ServiceTypesEditor.jsx",
    "components/settings/DataExport.jsx",
    "components/systemupdates/PendingChangesList.jsx",
    "components/systemupdates/VersionHistoryList.jsx",
    "components/mobile/BottomTabs.jsx",
    "components/GlobalSearch.jsx",
    "components/PullToRefresh.jsx",
    "components/ResponsiveSelect.jsx",
    "components/useServiceTypes.jsx",
    "components/PageTransition.jsx",
  ],
  functions: [
    "fetchMotiveVehicleData",
    "fetchMotiveMaintenanceData",
    "generateMaintenanceIntervals",
    "syncToGoogleCalendar",
    "downloadMaintenanceRecord",
    "convertImageToPDF",
    "uploadToGoogleDrive",
    "fixInventoryFromBills",
    "motiveWebhook",
    "validateUserUpdate",
  ],
  hooks: [
    "hooks/usePagePermissions.jsx",
  ],
  lib: [
    "lib/AuthContext.jsx",
    "lib/NavigationTracker.jsx",
    "lib/PageNotFound.jsx",
    "lib/query-client.js",
    "lib/utils.js",
    "lib/app-params.js",
  ],
};

async function getFileContentFromGitHub(accessToken, owner, repo, path) {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.github.v3+json" },
  });
  if (res.status === 404) return null;
  if (!res.ok) return null;
  const data = await res.json();
  return data; // { sha, content (base64), ... }
}

async function pushFileToGitHub(accessToken, owner, repo, path, content, message, existingSha) {
  const body = {
    message,
    content: btoa(unescape(encodeURIComponent(content))),
  };
  if (existingSha) body.sha = existingSha;

  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json();
    return { success: false, error: err.message };
  }
  return { success: true };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { action, repo, targetPath = "fleet-module", selectedFiles } = await req.json();

    if (action === "list_files") {
      return Response.json({ files: FLEET_FILES });
    }

    // Get GitHub access token
    const { accessToken } = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID);

    // Get GitHub user info
    const meRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const ghUser = await meRes.json();
    const owner = ghUser.login;

    if (action === "list_repos") {
      const reposRes = await fetch("https://api.github.com/user/repos?per_page=100&sort=updated&type=all", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const repos = await reposRes.json();
      return Response.json({ repos: repos.map(r => ({ name: r.full_name, private: r.private })), owner });
    }

    if (action === "push_files") {
      if (!repo) return Response.json({ error: "repo is required" }, { status: 400 });

      const filesToPush = selectedFiles || [];
      const results = [];
      const commitMessage = `Fleet Module Export - ${new Date().toISOString().split("T")[0]}`;

      for (const filePath of filesToPush) {
        // Read file from this app's source
        let sourceContent = null;
        try {
          // Files are served relative to the app source root
          const fileRes = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${filePath}`);
          // We read from the base44 internal file system via a known pattern
          // Actually we need to read using the SDK or direct FS access
          // Deno can read local files
          const localPath = `/app/src/${filePath}`;
          sourceContent = await Deno.readTextFile(localPath);
        } catch {
          results.push({ file: filePath, success: false, error: "Could not read source file" });
          continue;
        }

        const destPath = `${targetPath}/${filePath}`;
        const existing = await getFileContentFromGitHub(accessToken, owner, repo, destPath);
        const result = await pushFileToGitHub(
          accessToken, owner, repo, destPath, sourceContent, commitMessage, existing?.sha
        );
        results.push({ file: filePath, ...result });
      }

      const succeeded = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      return Response.json({ results, succeeded, failed });
    }

    if (action === "export_data") {
      // Export all fleet entity data as JSON
      const entityData = {};
      const entityNames = [
        "Vehicle", "MaintenanceRecord", "MaintenanceInterval",
        "Item", "Bill", "Vendor", "CalendarAppointment", "ServiceType"
      ];
      for (const name of entityNames) {
        try {
          const records = await base44.asServiceRole.entities[name].list();
          entityData[name] = records;
        } catch {
          entityData[name] = [];
        }
      }
      return Response.json({ data: entityData });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});