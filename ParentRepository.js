var mssql = require('mssql');
class ParentRepository {
    constructor(conn) {
        this.conn = conn;
    }
    async retrieve(name = null) {
        try {
            var req = new mssql.Request(this.conn);
            if (name)
                req.input('name', name);
            var res = await req.query('select * from Parent' + (name ? 'where ParentName=@name' : ''));
            return name ? res.recordset[0] : res.recordset;
        }
        catch (err) {
            console.log(err);
            return [];
        }
    }
    async insert(simpleParent) {
        if (!simpleParent)
            return;
        try {
            var req = new mssql.Request(this.conn);
            req.input("Name", simpleParent.Name);
            var res = await req.query('insert into Parent (ParentName) values (@Name) select scope_identity() as id');
            return res.recordset[0].id;
        }
        catch (err) {
            console.log(err);
            throw err;
        }
    }
    async update(simpleParent) {
        if (!simpleParent || !simpleParent.ID)
            return;
        try {
            var req = new mssql.Request(this.conn);
            req.input("id", simpleParent.ID);
            req.input("Name", simpleParent.Name);
            var ret = await req.query('update Parent set ParentName=@Name where id=@id');
            return ret.rowsAffected[0];
        }
        catch (err) {
            console.log(err);
            throw err;
        }
    }
}
async function main() {
    var conn = new mssql.ConnectionPool('server=localhost,1433;database=foo;user id=foo;password=foo');
    try {
        await conn.connect();
        var repo = new ParentRepository(conn);
        // pobierz wszystkie rekordy
        var items = await repo.retrieve();
        items.forEach(e => {
            console.log(JSON.stringify(e));
        });
        // pobierz rekord spełniający warunki
        var item = await repo.retrieve('Parent55');
        if (item) {
            item.Name = 'new name';
            // jeśli jest to go popraw
            var rowsAffected = await repo.update(item);
            console.log(`zmodyfikowano ${rowsAffected} rekordów`);
        }
        else {
            item = {
                Name: 'Parent55'
            };
            // jeśli nie ma to go utwórz i zwróć identyfikator nowo
            wstawionego;
            var id = await repo.insert(item);
            console.log(`identyfikator nowo wstawionego rekordu ${id}`);
        }
    }
    catch (err) {
        if (conn.connected)
            conn.close();
        console.log(err);
    }
}
main();
