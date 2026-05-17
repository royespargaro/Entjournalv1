rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 0. Global Safety Net
    match /{document=**} {
      allow read, write: if false;
    }

    // --- Helpers ---
    function isSignedIn() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }

    function isValidId(id) {
      return id is string && id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\-]+$');
    }

    function incoming() {
      return request.resource.data;
    }

    function existing() {
      return resource.data;
    }

    // --- Validation Blueprints ---
    
    function isValidTrade(data) {
      return data.userId == request.auth.uid
        && data.date is string && data.date.size() <= 128
        && (data.time == null || data.time is string && data.time.size() <= 128)
        && data.pair is string && data.pair.size() <= 100
        && data.dir in ['Long', 'Short', 'long', 'short']
        && (data.entry is number || data.entry is string)
        && (data.exit == null || data.exit is number || data.exit is string)
        && (data.pnl == null || data.pnl is number || data.pnl is string)
        && (data.result == null || data.result in ['win', 'loss', 'be', 'Win', 'Loss', 'BE'])
        && (data.lot == null || data.lot is number || data.lot is string)
        && (data.sl == null || data.sl is number || data.sl is string)
        && (data.tp == null || data.tp is number || data.tp is string)
        && (data.session == null || data.session is string)
        && (data.setup == null || data.setup is string)
        && (data.emotion == null || data.emotion is string)
        && (data.news == null || data.news is string)
        && (data.plan == null || data.plan is string)
        && (data.dur == null || data.dur is string)
        && (data.reason == null || data.reason is string)
        && (data.notes == null || data.notes is string)
        && (data.currency == null || data.currency is string)
        && (data.ss == null || data.ss is string)
        && (data.tags == null || data.tags is list)
        && (data.riskPercent == null || data.riskPercent is number || data.riskPercent is string)
        && (data.balance == null || data.balance is number || data.balance is string)
        && (data.id == null || data.id is string)
        && data.createdAt == request.time;
    }

    function isValidReview(data) {
      return data.userId == request.auth.uid
        && data.week is string && data.week.size() <= 20
        && (data.q1 == null || data.q1 is string && data.q1.size() <= 2000)
        && (data.q2 == null || data.q2 is string && data.q2.size() <= 2000)
        && (data.q3 == null || data.q3 is string && data.q3.size() <= 2000)
        && (data.q4 == null || data.q4 is string && data.q4.size() <= 2000)
        && (data.q5 == null || data.q5 is string && data.q5.size() <= 2000)
        && (data.q6 == null || data.q6 is string && data.q6.size() <= 2000)
        && data.createdAt == request.time;
    }

    function isValidPlan(data) {
      return data.userId == request.auth.uid
        && data.yearlyTarget is number
        && (data.monthlyTarget == null || data.monthlyTarget is number)
        && (data.weeklyTarget == null || data.weeklyTarget is number)
        && (data.dailyTarget == null || data.dailyTarget is number)
        && (data.currency == null || data.currency is string && data.currency.size() <= 10)
        && data.updatedAt == request.time;
    }

    function isValidDailySetup(data) {
      return data.userId == request.auth.uid
        && data.pair is string && data.pair.size() <= 50
        && data.dir in ['Long', 'Short']
        && (data.entry is number || data.entry is string)
        && (data.sl is number || data.sl is string)
        && (data.tp is number || data.tp is string)
        && (data.notes == null || data.notes is string && data.notes.size() <= 5000)
        && data.status in ['planned', 'active']
        && data.createdAt == request.time
        && data.keys().hasAll(['userId', 'pair', 'dir', 'entry', 'sl', 'tp', 'status', 'createdAt']);
    }

    function isValidDailyGoals(data) {
      return data.goals is string && data.goals.size() <= 5000
        && data.updatedAt == request.time
        && data.keys().hasAll(['goals', 'updatedAt'])
        && data.keys().size() == 2;
    }

    // --- Match Groups ---

    match /users/{userId} {
      allow get: if isOwner(userId);
      allow create: if isOwner(userId) 
        && incoming().email == request.auth.token.email;
      allow update: if isOwner(userId)
        && incoming().email == existing().email
        && incoming().diff(existing()).affectedKeys().hasOnly(['displayName', 'photoURL', 'tradingMethod']);

      match /plan/{planId} {
        allow get: if isOwner(userId);
        allow create, update: if isOwner(userId) && isValidId(planId) && isValidPlan(incoming());
        allow delete: if isOwner(userId);
      }

      match /trades/{tradeId} {
        allow list: if isOwner(userId);
        allow get: if isOwner(userId);
        allow create: if isOwner(userId) && isValidTrade(incoming());
        allow update: if isOwner(userId) 
          && incoming().userId == userId
          && incoming().createdAt == existing().createdAt
          && (incoming().updatedAt == request.time || true);
        allow delete: if isOwner(userId);
      }

      match /reviews/{reviewId} {
        allow list: if isOwner(userId);
        allow get: if isOwner(userId);
        allow create: if isOwner(userId) && isValidReview(incoming());
        allow update: if isOwner(userId)
          && incoming().userId == userId
          && incoming().createdAt == existing().createdAt;
        allow delete: if isOwner(userId);
      }

      match /dailySetups/{setupId} {
        allow list: if isOwner(userId);
        allow get: if isOwner(userId);
        allow create: if isOwner(userId) && isValidDailySetup(incoming());
        allow update: if isOwner(userId)
          && incoming().userId == userId
          && incoming().createdAt == existing().createdAt;
        allow delete: if isOwner(userId);
      }

      match /settings/dailyGoals {
        allow get: if isOwner(userId);
        allow create, update: if isOwner(userId) && isValidDailyGoals(incoming());
        allow delete: if isOwner(userId);
      }
    }
  }
}
