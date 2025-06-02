<?php
namespace Lazyphp\Core;
use \PDO as PDO;

class Database extends LmObject
{
    var $result = false;

    public function __construct( $dsn = null , $user = null , $password = null )
    {
        if( is_object( $dsn ) && strtolower(get_class( $dsn )) == 'pdo' )
        {
            $this->pdo = $dsn;
        }
        else
        {
            if( $dsn == null )
            {
                // if( is_devmode() )
                // {
                //     $dsn = c('database_dev','dsn');
                //     $user = c('database_dev','user');
                //     $password = c('database_dev','password');
                // }
                // else
                // {
                    $dsn = c('database','dsn');
                    $user = c('database','user');
                    $password = c('database','password');
                // }
                
                
            }
            $this->pdo = new PDO( $dsn , $user , $password );
        }

        if( is_devmode() )
            $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

        $this->pdo->exec("SET NAMES 'utf8mb4';");
    }

    // Store the PDOStatement result for fetching methods
    protected $stmt = null;

    /**
     * Prepares and executes a SQL statement.
     *
     * @param string $sql The SQL statement with placeholders.
     * @param array $params An array of values to bind to the placeholders.
     *                     For named placeholders, this should be an associative array (e.g., [':id' => 1]).
     *                     For positional placeholders (?), this should be a 0-indexed array.
     * @return \PDOStatement|false The PDOStatement object on success, or false on failure.
     */
    protected function executeStatement($sql, $params = [])
    {
        try {
            $this->stmt = $this->pdo->prepare($sql);
            if ($this->stmt) {
                $this->stmt->execute($params);
                return $this->stmt;
            }
            return false;
        } catch (\PDOException $e) {
            // Rethrow or handle as per application's error handling strategy
            // For now, rethrow to be caught by the global error handler in lp.init.php
            throw $e;
        }
    }

    /**
     * Executes a SQL statement for fetching data (SELECT).
     * After calling this, use one of the toArray(), toLine(), toVar() methods.
     *
     * @param string $sql The SQL SELECT statement with placeholders.
     * @param array $params Parameters to bind to the statement.
     * @return $this
     */
    public function getData($sql, $params = [])
    {
        $this->executeStatement($sql, $params);
        return $this;
    }

    /**
     * Executes a SQL statement that does not return a result set (INSERT, UPDATE, DELETE).
     *
     * @param string $sql The SQL statement with placeholders.
     * @param array $params Parameters to bind to the statement.
     * @return int|false The number of rows affected, or false on failure.
     */
    public function runSql($sql, $params = [])
    {
        $stmt = $this->executeStatement($sql, $params);
        return $stmt ? $stmt->rowCount() : false;
    }

    // export methods to retrieve data from $this->stmt
    public function toLine()
    {
        if (!$this->stmt) return false;
        $result = $this->stmt->fetch(PDO::FETCH_ASSOC);
        $this->stmt->closeCursor();
        $this->stmt = null;
        return $result;
    }

    public function toVar($field_index = 0) // $field_index refers to column number if not named
    {
        if (!$this->stmt) return false;
        $result = $this->stmt->fetchColumn($field_index);
        $this->stmt->closeCursor();
        $this->stmt = null;
        return $result;
    }

    public function toArray()
    {
        if (!$this->stmt) return false;
        $result = $this->stmt->fetchAll(PDO::FETCH_ASSOC);
        $this->stmt->closeCursor();
        $this->stmt = null;
        return $result ?: []; // Return empty array if no results
    }

    public function col($name)
    {
        return $this->toColumn($name);
    }

    public function toColumn($name_or_index = 0)
    {
        if (!$this->stmt) return false;
        $results = $this->stmt->fetchAll(PDO::FETCH_ASSOC);
        $this->stmt->closeCursor();
        $this->stmt = null;

        if (empty($results)) return [];

        $column = [];
        foreach ($results as $row) {
            if (is_int($name_or_index)) {
                 $values = array_values($row);
                 if(isset($values[$name_or_index])) $column[] = $values[$name_or_index];
            } elseif (isset($row[$name_or_index])) {
                $column[] = $row[$name_or_index];
            } else {
                // If the named column doesn't exist in a row, add null or skip?
                // For now, skip if not found by name to avoid errors with inconsistent rows.
            }
        }
        return $column;
    }

    public function index($name)
    {
        return $this->toIndexedArray($name);
    }

    public function toIndexedArray($key_column_name)
    {
        if (!$this->stmt) return false;
        $results = $this->stmt->fetchAll(PDO::FETCH_ASSOC);
        $this->stmt->closeCursor();
        $this->stmt = null;

        if (empty($results)) return [];

        $indexed_array = [];
        foreach ($results as $row) {
            if (isset($row[$key_column_name])) {
                $indexed_array[$row[$key_column_name]] = $row;
            }
        }
        return $indexed_array;
    }

    public function quote($string)
    {
        // This method is generally not needed when using prepared statements for parameters.
        // However, it might be used for other purposes (e.g., dynamically building parts of queries
        // like table or column names, though that should be done with extreme caution and whitelisting).
        return $this->pdo->quote($string);
    }

    public function lastId()
    {
        return $this->pdo->lastInsertId();
    }
}
