import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Accounts } from 'meteor/accounts-base';
import assert from 'assert';
import { StaleSession } from 'meteor/bboyredstar:stale-session';

if (Meteor.isServer) {
  describe('StaleSession Verification', function () {
    this.timeout(20000);
    let staleSession;
    const collectionName = 'test_heartbeats';
    const inactiveTimeoutMs = 5000;
    const heartbeatIntervalMs = 5000;

    before(async function () {
      // Ensure we have a user for testing
      const username = 'testuser';
      let user = await Meteor.users.findOneAsync({ username });
      if (!user) {
        await Accounts.createUserAsync({
          username,
          password: 'password',
          email: 'test@example.com'
        });
        user = await Meteor.users.findOneAsync({ username });
      }

      staleSession = new StaleSession({
        heartbeatCollectionName: collectionName,
        inactiveTimeoutMs,
        heartbeatIntervalMs,
        forceLogout: true
      });
      await staleSession.run();
    });

    it('Scenario 1: Collection has been created on server start', function () {
      const collection = staleSession.heartbeatCollection;
      assert.ok(collection, 'Collection should be initialized');
      assert.strictEqual(collection._name, collectionName, 'Collection name should match');
    });

    it('Scenario 2: User calls heartbeat method on activity', async function () {
      const user = await Meteor.users.findOneAsync({ username: 'testuser' });
      assert.ok(user, 'Test user should exist');

      // Mock being logged in as this user
      // Note: Meteor.callAsync handles the context if called within a method or pub, 
      // but here we might need to simulate the environment or just call the method logic.
      // Since it's a server test, we can try to call the internal method but it's better to 
      // use the actual method registered.
      
      // We'll use a hack to set the current userId for the test
      const originalUserId = Meteor.userId;
      Meteor.userId = () => user._id;

      try {
        const result = await Meteor.callAsync('heartbeat', {});
        assert.ok(result._id, 'Heartbeat should return an ID');
        
        const doc = await staleSession.heartbeatCollection.findOneAsync({ userId: user._id });
        assert.ok(doc, 'Heartbeat document should be found in collection');
        assert.strictEqual(doc.userId, user._id);
      } finally {
        Meteor.userId = originalUserId;
      }
    });

    it('Scenario 3: Interval handles correctly active sessions', async function () {
      const user = await Meteor.users.findOneAsync({ username: 'testuser' });
      
      // Create a fresh heartbeat
      await staleSession.heartbeatCollection.removeAsync({ userId: user._id });
      await staleSession.heartbeatCollection.insertAsync({
        userId: user._id,
        createdAt: new Date()
      });

      // Wait for a bit less than timeout
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check if it's still there
      const doc = await staleSession.heartbeatCollection.findOneAsync({ userId: user._id });
      assert.ok(doc, 'Active heartbeat should still exist');
    });

    it('Scenario 4: Interval closes correctly stale session. Doesn\'t affect on the newly created sessions', async function () {
      const user = await Meteor.users.findOneAsync({ username: 'testuser' });
      
      // 1. Create a STALE heartbeat
      const oldDate = new Date(Date.now() - 10000); // 10s ago, timeout is 5s
      
      // Ensure user has login tokens that are NOT newer than the heartbeat
      await Meteor.users.updateAsync(user._id, {
        $set: { 'services.resume.loginTokens': [{ when: oldDate, hashedToken: 'test' }] }
      });

      await staleSession.heartbeatCollection.removeAsync({ userId: user._id });
      await staleSession.heartbeatCollection.insertAsync({
        userId: user._id,
        createdAt: oldDate
      });

      // We need to trigger the interval logic. 
      // The interval is running every 5000ms.
      // Wait for at least one interval cycle + some buffer.
      await new Promise(resolve => setTimeout(resolve, 7000));

      // Check if heartbeat is removed
      const doc = await staleSession.heartbeatCollection.findOneAsync({ userId: user._id });
      assert.ok(!doc, 'Stale heartbeat should be removed');

      // Check if user tokens are cleared
      const updatedUser = await Meteor.users.findOneAsync(user._id);
      assert.strictEqual(updatedUser.services.resume.loginTokens.length, 0, 'Login tokens should be cleared');

      // 2. Test "Doesn't affect newly created sessions"
      // Add a stale heartbeat but also a NEWER login token
      await Meteor.users.updateAsync(user._id, {
        $set: { 'services.resume.loginTokens': [{ when: new Date(), hashedToken: 'new_token' }] }
      });
      
      await staleSession.heartbeatCollection.insertAsync({
        userId: user._id,
        createdAt: new Date(Date.now() - 10000) // 10s ago
      });

      // Wait for interval
      await new Promise(resolve => setTimeout(resolve, 7000));

      // Heartbeat should be removed because it's stale
      const doc2 = await staleSession.heartbeatCollection.findOneAsync({ userId: user._id });
      assert.ok(!doc2, 'Stale heartbeat record should be cleaned up');

      // BUT Tokens should NOT be cleared because there is a newer session
      const updatedUser2 = await Meteor.users.findOneAsync(user._id);
      assert.strictEqual(updatedUser2.services.resume.loginTokens.length, 1, 'Newer login token should NOT be cleared');
      assert.strictEqual(updatedUser2.services.resume.loginTokens[0].hashedToken, 'new_token');
    });

    it('Scenario 5: Multi-device logout - only specific stale session is removed', async function () {
      const user = await Meteor.users.findOneAsync({ username: 'testuser' });
      
      const session1 = 'hashed_token_1';
      const session2 = 'hashed_token_2';
      const now = new Date();
      const oldDate = new Date(now.getTime() - 10000); // 10s ago
      
      // 1. Setup two sessions for the same user
      await Meteor.users.updateAsync(user._id, {
        $set: { 
          'services.resume.loginTokens': [
            { when: oldDate, hashedToken: session1 }, // Stale session
            { when: now, hashedToken: session2 }      // Fresh session
          ] 
        }
      });

      // 2. Setup heartbeats for both
      await staleSession.heartbeatCollection.removeAsync({ userId: user._id });
      await staleSession.heartbeatCollection.insertAsync({
        userId: user._id,
        sessionId: session1,
        createdAt: oldDate
      });
      await staleSession.heartbeatCollection.insertAsync({
        userId: user._id,
        sessionId: session2,
        createdAt: now
      });

      // 3. Wait for interval
      await new Promise(resolve => setTimeout(resolve, 7000));

      // 4. Verify results
      const updatedUser = await Meteor.users.findOneAsync(user._id);
      const remainingTokens = updatedUser.services.resume.loginTokens;
      
      assert.strictEqual(remainingTokens.length, 1, 'Only one token should remain');
      assert.strictEqual(remainingTokens[0].hashedToken, session2, 'Active session 2 should remain');
      
      const staleDoc = await staleSession.heartbeatCollection.findOneAsync({ sessionId: session1 });
      assert.ok(!staleDoc, 'Stale heartbeat doc 1 should be removed');
      
      const activeDoc = await staleSession.heartbeatCollection.findOneAsync({ sessionId: session2 });
      assert.ok(activeDoc, 'Active heartbeat doc 2 should remain');
    });
  });
}
